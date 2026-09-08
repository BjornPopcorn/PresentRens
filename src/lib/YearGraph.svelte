<script>
  import { onMount, onDestroy } from "svelte";
  import Chart from "chart.js/auto";

  // runes mode prop access
  const { data, overlayMode = "gradient", overlayColor = "rgba(0,0,0,1)", overlayGradient = "linear-gradient(180deg,#6b21a8 0%, #7c3aed 50%, #4c1d95 100%)" } = $props();

  let canvasEl;
  let overlayDiv;
  let revealBtn;
  let chartInstance;

  // Lock DPR at mount to avoid mobile jitter
  let initialDpr = 1;
  let lastCssW = 0;

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

  // DPR-aware sizing but using the fixed initialDpr
  function setCanvasSize(cssHeight = 240) {
    if (!canvasEl) return { cssW: 600, cssH: cssHeight, dpr: initialDpr };
    canvasEl.style.width = "100%";
    canvasEl.style.height = `${cssHeight}px`;
    const cssW = canvasEl.clientWidth || canvasEl.offsetWidth || 600;
    const cssH = cssHeight;
    // Only update backing store if width changed meaningfully to avoid re-render jitter
    if (Math.abs(cssW - lastCssW) > 2) {
      canvasEl.width = Math.round(cssW * initialDpr);
      canvasEl.height = Math.round(cssH * initialDpr);
      canvasEl.style.width = `${cssW}px`;
      canvasEl.style.height = `${cssH}px`;
      lastCssW = cssW;
    }
    return { cssW, cssH, dpr: initialDpr };
  }

  onMount(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    // Capture DPR once at mount and use it for all canvas sizing and Chart rendering.
    initialDpr = Math.max(1, window.devicePixelRatio || 1);

    // compressed height (tighter vertical)
    const { cssW } = setCanvasSize(240);

    // Prepare data
    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));
    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    // smoothing + compression
    const smoothedRaw = smooth(counts, 4).map(v => Math.max(0, v));
    const compressFactor = 0.5;

    // small negative baseline to lift the curve slightly before forcing placement
    // keep baseline modest so we can control final placement via axis bounds
    const baselineOffset = -1.2;
    const smoothed = smoothedRaw.map(v => v * compressFactor + baselineOffset);

    // Compute Y bounds so the data occupies ~70% of vertical space and sits lower
    const dataMin = Math.min(...smoothed);
    const dataMax = Math.max(...smoothed);
    const visibleFraction = 0.7; // target fraction of chart height occupied by data
    const dataRange = Math.max(1e-6, dataMax - dataMin);

    // PUSH_FACTOR >1 pushes the curve lower (more empty space below)
    const PUSH_FACTOR = 1.4;

    // extra space below the data to make the curve sit lower
    const extraBelow = dataRange * ((1 - visibleFraction) / visibleFraction) * PUSH_FACTOR;

    // keep top tight (small headroom) so curve visually sits lower
    const topHeadroom = dataRange * 0.02;

    const yMin = dataMin - extraBelow;
    const yMax = dataMax + topHeadroom;

    // Round bounds to sensible numbers for Chart.js
    const suggestedMin = Math.floor(yMin);
    const suggestedMax = Math.ceil(yMax);

    // responsive tick font size and rotation
    const tickFontSize = cssW <= 420 ? 14 : 12;
    const tickRotation = cssW <= 420 ? 45 : 0;

    // Build Chart.js with locked DPR and explicit y.min/y.max to prevent auto-scaling
    chartInstance = new Chart(canvasEl, {
      type: "line",
      data: {
        labels: years,
        datasets: [{
          label: "Song Trend",
          data: smoothed,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.12)",
          tension: 0.45,
          borderWidth: 1.6, // thin stroke for readability
          pointRadius: 0,
          fill: "start"
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        devicePixelRatio: initialDpr,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        layout: { padding: 0 },
        scales: {
          x: {
            ticks: {
              color: "#fff",
              font: { size: tickFontSize, weight: "600" },
              callback: function(value, index, ticks) {
                const year = Number(this.getLabelForValue(value));
                if (index === 0 || index === ticks.length - 1) return year;
                if (year % 5 === 0) return year;
                return "";
              },
              maxRotation: tickRotation,
              minRotation: tickRotation,
              autoSkip: false
            },
            grid: { color: "rgba(255,255,255,0.12)" }
          },
          y: {
            // lock min/max so Chart.js does not auto-adjust and the curve sits lower
            min: suggestedMin,
            max: suggestedMax,
            ticks: { display: false },
            grid: { color: "rgba(255,255,255,0.06)" }
          }
        },
        elements: {
          line: {
            borderJoinStyle: "round",
            borderCapStyle: "round",
            borderWidth: 1.6
          }
        }
      }
    });

    // Apply overlay style (fully opaque block)
    if (overlayDiv) {
      overlayDiv.style.background = overlayMode === "gradient" ? overlayGradient : overlayColor;
      overlayDiv.style.left = "0";
      overlayDiv.style.top = "0";
      overlayDiv.style.width = "100%";
      overlayDiv.style.height = "100%";
      overlayDiv.style.opacity = "1";
      overlayDiv.style.display = "block";
    }

    // Resize handler: recompute font/rotation and resize chart but keep DPR locked
    const onResize = () => {
      const { cssW: newCssW } = setCanvasSize(240);
      const newTickSize = newCssW <= 420 ? 14 : 12;
      const newRotation = newCssW <= 420 ? 45 : 0;
      if (chartInstance) {
        chartInstance.options.devicePixelRatio = initialDpr;
        chartInstance.options.scales.x.ticks.font.size = newTickSize;
        chartInstance.options.scales.x.ticks.maxRotation = newRotation;
        chartInstance.options.scales.x.ticks.minRotation = newRotation;
        if (Math.abs(newCssW - lastCssW) > 2) {
          chartInstance.resize();
          chartInstance.update();
        }
      }
    };

    // Defer resize during scroll to avoid address-bar jitter
    let scrollTimeout = null;
    const onScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => onResize(), 200);
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    onDestroy(() => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      if (chartInstance) chartInstance.destroy();
    });
  });

  // Reveal overlay
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
    <div bind:this={overlayDiv} class="color-overlay" aria-hidden="true"></div>
    <canvas bind:this={canvasEl} class="chart-canvas"></canvas>
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
    height: 240px;
    overflow: hidden;
    background: transparent;
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
    image-rendering: auto;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .color-overlay {
    position: absolute;
    inset: 0;
    z-index: 22;
    pointer-events: none;
    background: rgba(0,0,0,1);
    opacity: 1;
    will-change: opacity;
  }

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

  @media (max-width: 420px) {
    .canvas-container { height: 260px; }
    .reveal-btn { padding: 0.9rem 1.4rem; font-size: 15px; }
  }
</style>
