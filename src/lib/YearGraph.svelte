<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  // runes mode prop access
  const { data } = $props();

  let canvasEl;
  let overlayImg;
  let revealBtn;
  let chartInstance;

  // Simple smoother (same as before)
  function smooth(values, radius = 4) {
    const out = [];
    for (let i = 0; i < values.length; i++) {
      let sum = 0, cnt = 0;
      for (let r = -radius; r <= radius; r++) {
        const idx = i + r;
        if (idx >= 0 && idx < values.length) { sum += values[idx]; cnt++; }
      }
      out.push(sum / Math.max(1, cnt));
    }
    return out;
  }

  // Core: capture chart canvas, downscale aggressively, apply heavy blur on upscaled canvas,
  // preserve alpha so overlay is transparent where chart is transparent.
  function makeHeavyBlurOverlay(srcCanvas, scaleFactor = 0.06, blurPx = 28) {
    // srcCanvas: already has alpha channel (transparent where nothing drawn)
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;

    // 1) tiny downsample canvas
    const tinyW = Math.max(1, Math.round(srcW * scaleFactor));
    const tinyH = Math.max(1, Math.round(srcH * scaleFactor));
    const tiny = document.createElement("canvas");
    tiny.width = tinyW;
    tiny.height = tinyH;
    const tctx = tiny.getContext("2d", { alpha: true });
    // clear to transparent
    tctx.clearRect(0, 0, tinyW, tinyH);
    // draw the full-resolution canvas into tiny canvas (browser resampling removes high-frequency detail)
    // use source internal pixels so pass srcCanvas (which is DPR-scaled)
    tctx.drawImage(srcCanvas, 0, 0, srcW, srcH, 0, 0, tinyW, tinyH);

    // 2) large canvas (same size as visible CSS area) where we apply blur filter while upscaling
    const large = document.createElement("canvas");
    // use CSS size of source to match layout (so overlay lines up)
    const cssW = srcCanvas.clientWidth || srcCanvas.width;
    const cssH = srcCanvas.clientHeight || srcCanvas.height;
    // use device pixels for crispness
    const dpr = window.devicePixelRatio || 1;
    large.width = Math.round(cssW * dpr);
    large.height = Math.round(cssH * dpr);
    const lctx = large.getContext("2d", { alpha: true });

    // ensure transparent background
    lctx.clearRect(0, 0, large.width, large.height);

    // apply heavy blur while drawing the upscaled tiny image
    // ctx.filter affects both color and alpha; this preserves transparency while blurring edges
    lctx.filter = `blur(${blurPx}px) saturate(0.7) contrast(0.9) brightness(0.95)`;
    // draw tiny upscaled to full size
    lctx.drawImage(tiny, 0, 0, tinyW, tinyH, 0, 0, large.width, large.height);

    // optional: add a very subtle white wash to mimic scattering (kept tiny)
    lctx.globalCompositeOperation = "source-over";
    lctx.fillStyle = "rgba(255,255,255,0.03)";
    lctx.fillRect(0, 0, large.width, large.height);

    // export PNG (preserves alpha)
    return large.toDataURL("image/png");
  }

  // Ensure canvas CSS/internal sizing matches so overlay aligns exactly
  function setCanvasSize(cssHeight = 360) {
    if (!canvasEl) return;
    canvasEl.style.width = "100%";
    canvasEl.style.height = `${cssHeight}px`;
    const cssW = canvasEl.clientWidth || canvasEl.offsetWidth || 600;
    const cssH = cssHeight;
    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = Math.round(cssW * dpr);
    canvasEl.height = Math.round(cssH * dpr);
    canvasEl.style.width = `${cssW}px`;
    canvasEl.style.height = `${cssH}px`;
  }

  onMount(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    // stabilize CSS size and DPR
    setCanvasSize(360);

    // prepare chart data
    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));
    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    const smoothedRaw = smooth(counts, 4).map(v => Math.max(0, v));
    const compressFactor = 0.5;
    const smoothed = smoothedRaw.map(v => v * compressFactor);
    const rawMax = Math.max(...smoothed, 1);
    const suggestedMax = Math.ceil(rawMax * 1.05);

    // create Chart.js (no animation)
    chartInstance = new Chart(canvasEl, {
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

    // create overlay image by capturing and heavy-blurring
    // small timeout ensures Chart has painted
    setTimeout(() => {
      try {
        // IMPORTANT: ensure the chart canvas background is transparent (Chart config uses transparent)
        const dataUrl = makeHeavyBlurOverlay(canvasEl, 0.06, 28); // 6% downscale, 28px blur
        if (dataUrl && overlayImg) {
          overlayImg.src = dataUrl;
          overlayImg.style.display = "block";
          // align overlay exactly
          overlayImg.style.left = "0";
          overlayImg.style.top = "0";
          overlayImg.style.width = "100%";
          overlayImg.style.height = "100%";
          overlayImg.style.opacity = "1";
          overlayImg.style.background = "transparent";
          // ensure browser uses smooth resampling
          overlayImg.style.imageRendering = "auto";
          // force layout
          overlayImg.offsetHeight;
        }
      } catch (e) {
        console.warn("makeHeavyBlurOverlay failed", e);
        if (overlayImg) overlayImg.style.display = "none";
      }
    }, 160);
  });

  function reveal() {
    if (!overlayImg || !revealBtn) return;
    overlayImg.style.transition = "opacity 0.9s cubic-bezier(.2,.9,.2,1)";
    requestAnimationFrame(() => {
      overlayImg.style.opacity = "0";
      revealBtn.style.transition = "opacity 0.3s ease";
      revealBtn.style.opacity = "0";
      revealBtn.style.pointerEvents = "none";
    });
    setTimeout(() => {
      if (overlayImg) overlayImg.style.display = "none";
      if (revealBtn) revealBtn.style.display = "none";
    }, 1000);
  }
</script>

<div class="graph-wrapper">
  <div class="canvas-container">
    <!-- overlay image: heavy blurred PNG (preserves alpha) -->
    <img
      bind:this={overlayImg}
      class="overlay-image"
      alt="blur overlay"
      style="display:none; position:absolute; left:0; top:0;"
    />

    <!-- Chart.js canvas (source). Keep canvas background transparent so overlay preserves alpha -->
    <canvas bind:this={canvasEl} class="chart-canvas"></canvas>

    <!-- subtle grain on top (optional) -->
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
  }

  .canvas-container {
    position: relative;
    width: 100%;
    height: 360px;
    overflow: hidden;
    /* page background visible behind canvas; keep this as your page background */
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
    background: transparent; /* IMPORTANT: keep canvas transparent */
  }

  .overlay-image {
    z-index: 22;
    object-fit: cover;
    width: 100%;
    height: 100%;
    display: block;
    position: absolute;
    left: 0;
    top: 0;

    /* we already applied heavy blur in canvas; keep only subtle tuning here */
    filter: saturate(0.85) contrast(0.95) brightness(0.96);
    transition: opacity 0.9s cubic-bezier(.2,.9,.2,1);
    opacity: 1;
    pointer-events: none;
    will-change: opacity;
    background: transparent;
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
