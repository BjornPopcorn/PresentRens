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
  const DOWNSAMPLE_FACTOR = 0.08; // 8% of original -> aggressive downsample
  const BLUR_RADIUS = 14.0;       // blur radius in pixels (tune 12-18)
  const DOWNSAMPLE_MAX = 1024;    // clamp downsample size for performance

  // ---------- WebGL helpers ----------
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

  const VERTEX_SRC = `
    attribute vec2 a_pos;
    attribute vec2 a_uv;
    varying vec2 v_uv;
    void main() {
      v_uv = a_uv;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // Separable blur fragment shader (9-tap)
  const FRAGMENT_BLUR_SRC = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform vec2 u_texelSize;
    uniform vec2 u_direction;
    uniform float u_radius;

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

      // desaturate + slight contrast/brightness tweak
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 desat = mix(color.rgb, vec3(gray), 0.35);
      desat = desat * 0.95 + 0.02;
      gl_FragColor = vec4(desat, color.a);
    }
  `;

  // GL resources
  let gl = null;
  let blurProgram = null;
  let quadVBO = null;
  let texSmall = null;   // downsampled texture
  let texTemp = null;    // intermediate texture (screen-sized)
  let fbSmall = null;
  let fbTemp = null;

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

  function createEmptyTexture(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

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

  function initWebGL() {
    // create context with alpha and no premultiplied alpha so canvas composites transparently
    gl = glCanvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) throw new Error("WebGL not supported");
    gl.clearColor(0, 0, 0, 0);

    blurProgram = createProgram(gl, VERTEX_SRC, FRAGMENT_BLUR_SRC);
    gl.useProgram(blurProgram);
    quadVBO = setupQuad(gl, blurProgram);

    // uniform locations
    blurProgram.u_texture = gl.getUniformLocation(blurProgram, "u_texture");
    blurProgram.u_texelSize = gl.getUniformLocation(blurProgram, "u_texelSize");
    blurProgram.u_direction = gl.getUniformLocation(blurProgram, "u_direction");
    blurProgram.u_radius = gl.getUniformLocation(blurProgram, "u_radius");
  }

  // Resize and prepare textures/framebuffers
  function resizeAndPrepare() {
    if (!chartCanvas || !glCanvas || !gl) return;

    const cssW = chartCanvas.clientWidth || chartCanvas.offsetWidth || 600;
    const cssH = chartCanvas.clientHeight || chartCanvas.offsetHeight || 320;
    const dpr = window.devicePixelRatio || 1;

    // ensure chart canvas internal size is set by Chart code; glCanvas should match CSS size
    glCanvas.style.width = `${cssW}px`;
    glCanvas.style.height = `${cssH}px`;
    glCanvas.width = Math.round(cssW * dpr);
    glCanvas.height = Math.round(cssH * dpr);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);

    // compute downsampled size (clamped)
    const dsW = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.width * DOWNSAMPLE_FACTOR)));
    const dsH = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.height * DOWNSAMPLE_FACTOR)));

    // cleanup old
    if (texSmall) { gl.deleteTexture(texSmall); texSmall = null; }
    if (texTemp) { gl.deleteTexture(texTemp); texTemp = null; }
    if (fbSmall) { gl.deleteFramebuffer(fbSmall); fbSmall = null; }
    if (fbTemp) { gl.deleteFramebuffer(fbTemp); fbTemp = null; }

    // small texture (downsampled)
    texSmall = createEmptyTexture(gl, dsW, dsH);
    fbSmall = createFramebuffer(gl, texSmall);

    // temp texture at screen size (we render upscaled blurred result here)
    texTemp = createEmptyTexture(gl, glCanvas.width, glCanvas.height);
    fbTemp = createFramebuffer(gl, texTemp);
  }

  // Upload downsampled chart into texSmall using 2D offscreen canvas (browser resampling)
  function uploadDownsampledTexture() {
    const dsW = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.width * DOWNSAMPLE_FACTOR)));
    const dsH = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.height * DOWNSAMPLE_FACTOR)));
    const off = document.createElement("canvas");
    off.width = dsW;
    off.height = dsH;
    const ctx = off.getContext("2d");
    // draw chartCanvas into small canvas (use internal pixel buffer for crispness)
    ctx.drawImage(chartCanvas, 0, 0, chartCanvas.width, chartCanvas.height, 0, 0, dsW, dsH);

    gl.bindTexture(gl.TEXTURE_2D, texSmall);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  // Two-pass separable blur: sample texSmall (downsampled) and render to fbTemp (screen-sized), then final pass to screen
  function runBlurPasses() {
    gl.useProgram(blurProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);

    // PASS 1: horizontal blur - sample texSmall, render to fbTemp (screen-sized)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbTemp);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texSmall);
    gl.uniform1i(blurProgram.u_texture, 0);

    // texelSize is 1 / size of the texture we sample (texSmall)
    const dsW = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.width * DOWNSAMPLE_FACTOR)));
    const dsH = Math.max(1, Math.min(DOWNSAMPLE_MAX, Math.round(glCanvas.height * DOWNSAMPLE_FACTOR)));
    gl.uniform2f(blurProgram.u_texelSize, 1.0 / dsW, 1.0 / dsH);

    // horizontal
    gl.uniform2f(blurProgram.u_direction, 1.0, 0.0);
    // scale radius relative to downsampled texel density so blur covers intended visual radius
    const radiusForSmall = Math.max(1.0, BLUR_RADIUS * (dsW / glCanvas.width));
    gl.uniform1f(blurProgram.u_radius, radiusForSmall);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // PASS 2: vertical blur - sample texTemp (which now contains horizontally blurred upscaled result), render to default framebuffer (screen)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texTemp);
    gl.uniform1i(blurProgram.u_texture, 0);

    // texelSize for screen-sized texture
    gl.uniform2f(blurProgram.u_texelSize, 1.0 / glCanvas.width, 1.0 / glCanvas.height);
    gl.uniform2f(blurProgram.u_direction, 0.0, 1.0);
    gl.uniform1f(blurProgram.u_radius, BLUR_RADIUS);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  // Render once (upload + blur)
  function renderOnce() {
    if (!gl) return;
    try {
      uploadDownsampledTexture();
      runBlurPasses();
    } catch (e) {
      console.warn("WebGL render error:", e);
    }
  }

  // Public refresh
  function refreshBlur() {
    try {
      resizeAndPrepare();
      renderOnce();
    } catch (e) {
      console.warn("refreshBlur failed:", e);
    }
  }

  // ---------- Chart + lifecycle ----------
  onMount(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    // Ensure chart canvas CSS size and internal DPR sizing
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
    function smoothArr(values, radius = 4) {
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
    const smoothedRaw = smoothArr(counts, 4).map(v => Math.max(0, v));
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
      refreshBlur();
    } catch (e) {
      console.error("WebGL init failed:", e);
      // fallback: do nothing (chart still visible); you can implement CPU fallback if desired
    }

    // Resize handler and chart update hook
    const onResize = () => {
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

    // Hook Chart update to refresh blur
    const originalUpdate = chartInstance.update.bind(chartInstance);
    chartInstance.update = function(...args) {
      const res = originalUpdate(...args);
      refreshBlur();
      return res;
    };

    onDestroy(() => {
      window.removeEventListener("resize", onResize);
      if (chartInstance) chartInstance.destroy();
      // cleanup GL resources
      try {
        if (gl) {
          if (texSmall) gl.deleteTexture(texSmall);
          if (texTemp) gl.deleteTexture(texTemp);
          if (fbSmall) gl.deleteFramebuffer(fbSmall);
          if (fbTemp) gl.deleteFramebuffer(fbTemp);
        }
      } catch (e) {}
    });
  });

  // Reveal: fade out the GL canvas overlay
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

    <!-- subtle grain overlay on top of GL result -->
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
    max-width: 900px;
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
    background: transparent;
  }

  .gl-canvas {
    pointer-events: none;
    opacity: 1;
    will-change: opacity;
    image-rendering: auto;
    background: transparent;
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
