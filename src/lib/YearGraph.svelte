<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  // runes mode prop access
  const { data, overlayColor = "rgba(0,0,0,1)" } = $props();

  let canvasEl;
  let overlayDiv;
  let revealBtn;
  let chartInstance;

  // Simple moving-average smoother
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

    // Stabilize CSS size and DPR
    setCanvasSize(360);

    // Prepare chart data
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

    // Create Chart.js (no animation). Canvas background must be transparent.
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
        layout: { padding: 0 },
        scales: {
          x: { ticks: { color: "#fff", font: { size: 12 } }, grid: { color: "rgba(255,255,255,0.12)" } },
          y: { ticks: { display: false }, grid: { color: "rgba(255,255,255,0.08)" }, suggestedMax, suggestedMin: 0 }
        },
        elements: {
          line: { borderJoinStyle: "round" }
        }
      }
    });

    // Ensure overlay color is fully opaque and covers the chart completely
    if (overlayDiv) {
      overlayDiv.style.background = overlayColor;
      overlayDiv.style.left = "0";
      overlayDiv.style.top = "0";
      overlayDiv.style.width = "100%";
      overlayDiv.style.height = "100%";
      overlayDiv.style.opacity = "1";
      overlayDiv.style.display = "block";
    }
  });

  // Reveal: fade overlay to transparent and hide button
  function reveal() {
    if (!overlayDiv || !revealBtn) return;
    overlayDiv.style.transition = "opacity 0.5s ease";
    revealBtn.style.transition = "opacity 0.28s ease";
    requestAnimationFrame(() => {
      overlayDiv.style.opacity = "0";
      revealBtn.style.opacity = "0";
      revealBtn.style.pointerEvents = "none";
    });
    setTimeout(() => {
      if (overlayDiv) overlayDiv.style.display = "none";
      if (revealBtn) revealBtn.style.display = "none";
    }, 600);
  }
</script>

<div class="graph-wrapper">
  <div class="canvas-container">
    <!-- fully opaque colored block overlay that completely hides the chart initially -->
    <div bind:this={overlayDiv} class="color-overlay" aria-hidden="true"></div>

    <!-- Chart.js canvas (source). Keep canvas background transparent so page background shows through when overlay removed -->
    <canvas bind:this={canvasEl} class="chart-canvas"></canvas>

    <!-- optional grain on top of the block to avoid a perfectly flat look -->
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

  /* Fully opaque colored block overlay that hides the chart completely */
  .color-overlay {
    position: absolute;
    inset: 0;
    z-index: 22;
    pointer-events: none;
    background: rgba(0,0,0,1); /* default; overwritten by prop */
    opacity: 1;
    will-change: opacity;
  }

  /* subtle grain to avoid a flat solid block look (optional) */
  .grain-overlay {
    position: absolute;
    inset: 0;
    z-index: 24;
    pointer-events: none;
    mix-blend-mode: overlay;
    opacity: 0.08;
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
    transition: opacity 0.28s ease, transform 0.12s ease;
  }

  .reveal-btn:active {
    transform: translate(-50%, -50%) scale(0.96);
  }
</style>
