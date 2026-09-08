<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  // expects: data = [{ year, count }]
  export let data = [];

  let canvas;
  let overlayImg;
  let revealBtn;
  let chartInstance;

  function smooth(values, radius = 4) {
    const out = [];
    for (let i = 0; i < values.length; i++) {
      let sum = 0, count = 0;
      for (let r = -radius; r <= radius; r++) {
        const idx = i + r;
        if (idx >= 0 && idx < values.length) {
          sum += values[idx];
          count++;
        }
      }
      out.push(sum / Math.max(1, count));
    }
    return out;
  }

  // A: downscale VERY aggressively (5–10%), then upscale + blur
  function createDownscaledDataUrl(srcCanvas, scaleFactor = 0.08) {
    try {
      const srcW = srcCanvas.width;
      const srcH = srcCanvas.height;
      const dstW = Math.max(1, Math.round(srcW * scaleFactor));
      const dstH = Math.max(1, Math.round(srcH * scaleFactor));

      const off = document.createElement("canvas");
      off.width = dstW;
      off.height = dstH;
      const ctx = off.getContext("2d");

      ctx.drawImage(srcCanvas, 0, 0, srcW, srcH, 0, 0, dstW, dstH);

      return off.toDataURL("image/png");
    } catch (e) {
      console.warn("Downscale snapshot failed", e);
      return null;
    }
  }

  function setCanvasCssSize(pxHeight = 320) {
    if (!canvas) return;
    canvas.style.width = "100%";
    canvas.style.height = `${pxHeight}px`;
  }

  onMount(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    setCanvasCssSize(320);

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

    const cssW = canvas.clientWidth || canvas.offsetWidth || 600;
    const cssH = canvas.clientHeight || 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    chartInstance = new Chart(canvas, {
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
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: {
            ticks: { color: "#ffffff", font: { size: 12 } },
            grid: { color: "rgba(255,255,255,0.12)" }
          },
          y: {
            ticks: { display: false },
            grid: { color: "rgba(255,255,255,0.08)" },
            suggestedMax,
            suggestedMin: 0
          }
        }
      }
    });

    setTimeout(() => {
      try {
        const downscaled = createDownscaledDataUrl(canvas, 0.08); // 8% of original
        if (downscaled && overlayImg) {
          overlayImg.src = downscaled;
          overlayImg.style.display = "block";

          overlayImg.style.left = "0";
          overlayImg.style.top = "0";
          overlayImg.style.width = "100%";
          overlayImg.style.height = "100%";
          overlayImg.style.opacity = "1";

          overlayImg.offsetHeight;
        }
      } catch (e) {
        console.warn("Snapshot failed:", e);
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
    <!-- dynamic frosted overlay: tiny downscaled snapshot, upscaled + blur -->
    <img
      bind:this={overlayImg}
      class="overlay-image"
      alt="blur overlay"
      style="display:none; position:absolute; left:0; top:0;"
    />

    <canvas bind:this={canvas}></canvas>

    <!-- subtle grain to break up residual structure -->
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
    max-width: 700px;
    margin: 2rem auto;
    min-height: 360px;
  }

  .canvas-container {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 320px;
    overflow: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    background: transparent;
    position: relative;
    z-index: 1;
  }

  .overlay-image {
    z-index: 22;
    object-fit: fill; /* map pixels 1:1 to canvas area */
    width: 100%;
    height: 100%;
    display: block;
    position: absolute;
    left: 0;
    top: 0;

    /* key: upscale of tiny image + strong blur => real frosted look */
    filter: blur(18px) saturate(0.6) contrast(0.85) brightness(0.95);
    background: rgba(255,255,255,0.03);

    transition: opacity 0.9s cubic-bezier(.2,.9,.2,1);
    opacity: 1;
    pointer-events: none;
    will-change: opacity;
    image-rendering: auto;
  }

  .grain-overlay {
    position: absolute;
    inset: 0;
    z-index: 23;
    pointer-events: none;
    opacity: 0.25;
    mix-blend-mode: overlay;
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
    z-index: 30;
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
