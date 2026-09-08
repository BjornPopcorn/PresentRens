<script>
  import { onMount, onDestroy } from "svelte";
  import Chart from "chart.js/auto";

  // Runes mode prop access
  const { data } = $props();

  let chartCanvas;        // Chart.js canvas (source)
  let glCanvas;           // WebGL canvas (overlay)
  let revealBtn;
  let chartInstance;

  // Tuning: smaller downsample => stronger diffusion; blur radius controls shader kernel
  const DOWNSAMPLE_FACTOR = 0.08; // 8% of original -> very aggressive downscale for frosted look
  const BLUR_RADIUS = 12.0;       // blur radius in pixels (applied after downsample)
  const DOWNSAMPLE_MAX = 512;     // clamp downsample size for performance

  // Utility: compile shader
  function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error("Shader compile error: " + err);
    }
    return s;
  }

  // Utility: link program
  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error("Program link error: " + err);
    }
    return prog;
  }

  // Fullscreen quad vertex shader (same for both passes)
  const VERTEX_SRC = `
    attribute vec2 a_pos;
    attribute vec2 a_uv;
    varying vec2 v_uv;
    void main() {
      v_uv = a_uv;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // Fragment shader for a single separable blur pass.
  // direction: (1.0, 0.0) horizontal or (0.0, 1.0) vertical
  // We use a fixed 9-tap kernel with linear sampling offsets for performance.
  const FRAGMENT_BLUR_SRC = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform vec2 u_texelSize; // 1/textureSize
    uniform vec2 u_direction; // blur direction
    uniform float u_radius;   // blur radius in pixels (for weight scaling)

    // Precomputed weights for 9 taps (center + 4 pairs)
    // These are normalized gaussian-like weights; you can tweak if needed.
    float w0 = 0.2270270270;
    float w1 = 0.1945945946;
    float w2 = 0.1216216216;
    float w3 = 0.0540540541;
    float w4 = 0.0162162162;

    void main() {
      vec2 step = u_direction * u_texelSize * u_radius;
      vec4 color = texture2D(u_texture, v_uv) * w0;
      color += texture2D(u_texture, v_uv + step * 1.0) * w1;
      color += texture2D(u_texture, v_uv - step * 1.0) * w1;
      color += texture2D(u_texture, v_uv + step * 2.0) * w2;
      color += texture2D(u_texture, v_uv - step * 2.0) * w2;
      color += texture2D(u_texture, v_uv + step * 3.0) * w3;
      color += texture2D(u_texture, v_uv - step * 3.0) * w3;
      color += texture2D(u_texture, v_uv + step * 4.0) * w4;
      color += texture2D(u_texture, v_uv - step * 4.0) * w4;
      // Slight desaturate + contrast compression to reduce edge pop
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 desat = mix(color.rgb, vec3(gray), 0.35);
      desat = desat * 0.95 + 0.02; // slight brightness/contrast tweak
      gl_FragColor = vec4(desat, color.a);
    }
  `;

  // Create a texture from a source canvas
  function createTextureFromCanvas(gl, canvas) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  // Create an empty texture for framebuffer rendering
  function createEmptyTexture(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  // Create framebuffer attached to a texture
  function createFramebuffer(gl, tex) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("Framebuffer incomplete: " + status);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
  }

  // Draw a fullscreen quad (setup once)
  function setupQuad(gl, program) {
    const posLoc = gl.getAttribLocation(program, "a_pos");
    const uvLoc = gl.getAttribLocation(program, "a_uv");

    const quadVerts = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
       1,  1, 1, 1
    ]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);

    return vbo;
  }

  // Main WebGL pipeline: takes chartCanvas as source, renders blurred result to glCanvas
  let gl, blurProgram, quadVBO, texSource, texTemp, fbTemp, fbOut;

  function initWebGL() {
    gl = glCanvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL not supported");

    blurProgram = createProgram(gl, VERTEX_SRC, FRAGMENT_BLUR_SRC);
    gl.useProgram(blurProgram);
    quadVBO = setupQuad(gl, blurProgram);

    // uniforms locations
    blurProgram.u_texture = gl.getUniformLocation(blurProgram, "u_texture");
    blurProgram.u_texelSize = gl.getUniformLocation(blurProgram, "u_texelSize");
    blurProgram.u_direction = gl.getUniformLocation(blurProgram, "u_direction");
    blurProgram.u_radius = gl.getUniformLocation(blurProgram, "u_radius");
  }

  // Resize both canvases and recreate textures/framebuffers
  function resizeAndPrepare() {
    if (!chartCanvas || !glCanvas || !gl) return;

    // match CSS size and DPR
    const cssW = chartCanvas.clientWidth || chartCanvas.offsetWidth || 600;
    const cssH = chartCanvas.clientHeight || chartCanvas.offsetHeight || 320;
    const dpr = window.devicePixelRatio || 1;

    // chartCanvas internal size already set by Chart code; ensure glCanvas matches CSS pixels
    glCanvas.style.width = `${cssW}px`;
    glCanvas.style.height = `${cssH}px`;
    glCanvas.width = Math.round(cssW * dpr);
    glCanvas.height = Math.round(cssH * dpr);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);

    // compute downsampled size (clamped)
    const dsW = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.width * DOWNSAMPLE_FACTOR)));
    const dsH = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.height * DOWNSAMPLE_FACTOR)));

    // create textures and framebuffers
    if (texSource) gl.deleteTexture(texSource);
    if (texTemp) gl.deleteTexture(texTemp);
    if (fbTemp) gl.deleteFramebuffer(fbTemp);
    if (fbOut) gl.deleteFramebuffer(fbOut);

    // source texture will be created from chartCanvas each frame (texSource placeholder)
    texTemp = createEmptyTexture(gl, dsW, dsH);
    fbTemp = createFramebuffer(gl, texTemp);

    // output texture at screen size
    texSource = createEmptyTexture(gl, glCanvas.width, glCanvas.height);
    fbOut = createFramebuffer(gl, texSource);
  }

  // Upload chartCanvas into a temporary downsampled texture using a 2D canvas (fast path)
  function uploadDownsampledTexture() {
    // create offscreen canvas sized to downsample target
    const dsW = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.width * DOWNSAMPLE_FACTOR)));
    const dsH = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.height * DOWNSAMPLE_FACTOR)));
    const off = document.createElement("canvas");
    off.width = dsW;
    off.height = dsH;
    const ctx = off.getContext("2d");
    // draw chartCanvas into small canvas (browser resampling removes high-frequency detail)
    ctx.drawImage(chartCanvas, 0, 0, chartCanvas.width, chartCanvas.height, 0, 0, dsW, dsH);

    // upload to texTemp (which is dsW x dsH)
    gl.bindTexture(gl.TEXTURE_2D, texTemp);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  // Two-pass blur: horizontal then vertical. We render to full-screen target (fbOut) at screen resolution.
  function runBlurPasses() {
    // First pass: sample texTemp (downsampled) and render to an intermediate texture at screen size using horizontal blur
    gl.useProgram(blurProgram);

    // Bind attributes (quadVBO already bound in setupQuad)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);

    // PASS 1: horizontal blur - render to fbOut (screen-sized texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbOut);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);

    // Bind the small texture as source (texTemp)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texTemp);
    gl.uniform1i(blurProgram.u_texture, 0);

    // texelSize should be 1 / sourceTextureSize (we sample from texTemp)
    const dsW = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.width * DOWNSAMPLE_FACTOR)));
    const dsH = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.height * DOWNSAMPLE_FACTOR)));
    gl.uniform2f(blurProgram.u_texelSize, 1.0 / dsW, 1.0 / dsH);
    gl.uniform2f(blurProgram.u_direction, 1.0, 0.0);
    gl.uniform1f(blurProgram.u_radius, BLUR_RADIUS);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // PASS 2: vertical blur - sample from fbOut (which currently holds horizontally blurred upscaled result)
    // To do this, we need to bind the texture we just rendered (texSource) and render to the default framebuffer (screen)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texSource);
    gl.uniform1i(blurProgram.u_texture, 0);

    // texelSize now corresponds to texSource size (screen)
    gl.uniform2f(blurProgram.u_texelSize, 1.0 / glCanvas.width, 1.0 / glCanvas.height);
    gl.uniform2f(blurProgram.u_direction, 0.0, 1.0);
    gl.uniform1f(blurProgram.u_radius, BLUR_RADIUS);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Unbind
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  // Render loop: update texture from chart and run blur
  let rafId = null;
  function renderOnce() {
    if (!gl) return;
    try {
      // Upload downsampled chart into texTemp
      uploadDownsampledTexture();

      // Run blur passes (horizontal then vertical)
      runBlurPasses();
    } catch (e) {
      console.warn("WebGL render error:", e);
    }
  }

  // Public: call when chart updates
  function refreshBlur() {
    // ensure sizes are correct
    resizeAndPrepare();
    renderOnce();
  }

  // Build Chart and WebGL on mount
  onMount(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    // Build chart (ensure canvas internal size matches CSS and DPR)
    const cssW = chartCanvas.clientWidth || chartCanvas.offsetWidth || 600;
    const cssH = chartCanvas.clientHeight || chartCanvas.offsetHeight || 320;
    const dpr = window.devicePixelRatio || 1;
    chartCanvas.width = Math.round(cssW * dpr);
    chartCanvas.height = Math.round(cssH * dpr);
    chartCanvas.style.width = `${cssW}px`;
    chartCanvas.style.height = `${cssH}px`;

    // Prepare data
    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));
    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    // smoothing
    function smooth(values, radius = 4) {
      const out = [];
      for (let i = 0; i < values.length; i++) {
        let sum = 0, cnt = 0;
        for (let r = -radius; r <= radius; r++) {
          const idx = i + r;
          if (idx >= 0 && idx < values.length) {
            sum += values[idx];
            cnt++;
          }
        }
        out.push(sum / Math.max(1, cnt));
      }
      return out;
    }
    const smoothedRaw = smooth(counts, 4).map(v => Math.max(0, v));
    const compressFactor = 0.5;
    const smoothed = smoothedRaw.map(v => v * compressFactor);
    const rawMax = Math.max(...smoothed, 1);
    const suggestedMax = Math.ceil(rawMax * 1.05);

    chartInstance = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: years,
        datasets: [{
          label: "Song Trend",
          data: smoothed,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.10)",
          tension: 0.6,
          borderWidth: 3,
          pointRadius: 0,
          fill: true
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { ticks: { color: "#fff", font: { size: 12 } }, grid: { color: "rgba(255,255,255,0.12)" } },
          y: { ticks: { display: false }, grid: { color: "rgba(255,255,255,0.08)" }, suggestedMax, suggestedMin: 0 }
        }
      }
    });

    // Initialize WebGL overlay
    try {
      initWebGL();
      resizeAndPrepare();
      // initial render
      refreshBlur();
    } catch (e) {
      console.error("WebGL init failed:", e);
    }

    // If chart data may change later, observe and refresh blur
    // Simple approach: refresh on window resize and when Chart updates
    const onResize = () => {
      // update chart internal size to match CSS
      const cssW2 = chartCanvas.clientWidth || chartCanvas.offsetWidth || 600;
      const cssH2 = chartCanvas.clientHeight || chartCanvas.offsetHeight || 320;
      const dpr2 = window.devicePixelRatio || 1;
      chartCanvas.width = Math.round(cssW2 * dpr2);
      chartCanvas.height = Math.round(cssH2 * dpr2);
      chartCanvas.style.width = `${cssW2}px`;
      chartCanvas.style.height = `${cssH2}px`;
      if (chartInstance) chartInstance.resize();
      resizeAndPrepare();
      refreshBlur();
    };
    window.addEventListener("resize", onResize);

    // Hook Chart update: whenever chart is updated, refresh blur
    const originalUpdate = chartInstance.update.bind(chartInstance);
    chartInstance.update = function(...args) {
      const res = originalUpdate(...args);
      refreshBlur();
      return res;
    };

    onDestroy(() => {
      window.removeEventListener("resize", onResize);
      if (chartInstance) chartInstance.destroy();
      if (rafId) cancelAnimationFrame(rafId);
      // cleanup GL resources
      try {
        if (gl) {
          if (texSource) gl.deleteTexture(texSource);
          if (texTemp) gl.deleteTexture(texTemp);
          if (fbTemp) gl.deleteFramebuffer(fbTemp);
          if (fbOut) gl.deleteFramebuffer(fbOut);
        }
      } catch (e) {}
    });
  });

  // Reveal button fades out the overlay (glCanvas is on top; we animate its opacity)
  function reveal() {
    if (!glCanvas || !revealBtn) return;
    glCanvas.style.transition = "opacity 0.9s cubic-bezier(.2,.9,.2,1)";
    revealBtn.style.transition = "opacity 0.3s ease";
    requestAnimationFrame(() => {
      glCanvas.style.opacity = "0";
      revealBtn.style.opacity = "0";
      revealBtn.style.pointerEvents = "none";
    });
    setTimeout(() => {
      if (glCanvas) glCanvas.style.display = "none";
      if (revealBtn) revealBtn.style.display = "none";
    }, 1000);
  }
</script>

<div class="graph-wrapper">
  <div class="canvas-container">
    <!-- Chart.js canvas (source) -->
    <canvas bind:this={chartCanvas} class="chart-canvas"></canvas>

    <!-- WebGL canvas overlay (renders blurred result) -->
    <canvas bind:this={glCanvas} class="gl-canvas" style="position:absolute; left:0; top:0; width:100%; height:100%; z-index:20;"></canvas>

    <!-- subtle grain overlay on top of GL result (optional) -->
    <div class="grain-overlay" aria-hidden="true"></div>
  </div>

  <button bind:this={revealBtn} class="reveal-btn" on:click={reveal}>
    Reveal Song Distribution Graph
  </button>
</div>

<style>
  .graph-wrapper {
    position: relative;
    width: 100%;
    max-width: 800px;
    margin: 2rem auto;
    min-height: 360px;
  }

  .canvas-container {
    position: relative;
    width: 100%;
    height: 360px;
    overflow: hidden;
    background: linear-gradient(180deg, #0b1220 0%, #0f1724 100%);
  }

  .chart-canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    display: block;
  }

  .gl-canvas {
    pointer-events: none;
    opacity: 1;
    will-change: opacity;
    image-rendering: auto;
  }

  .grain-overlay {
    position: absolute;
    inset: 0;
    z-index: 30;
    pointer-events: none;
    mix-blend-mode: overlay;
    opacity: 0.18;
    background-image:
      radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px);
    background-size: 6px 6px, 8px 8px;
    filter: blur(0.6px);
  }

  .reveal-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 40;
    padding: 0.8rem 1.2rem;
    border-radius: 8px;
    background: white;
    color: black;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: opacity 0.3s ease, transform 0.12s ease;
  }

  .reveal-btn:active {
    transform: translate(-50%, -50%) scale(0.96);
  }
</style>
