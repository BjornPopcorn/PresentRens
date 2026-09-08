<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;
  let blurImg;
  let blurWrap;
  let revealBtn;
  let chartInstance;

  function smooth(values, radius = 4) {
    const result = [];
    for (let i = 0; i < values.length; i++) {
      let sum = 0;
      let count = 0;
      for (let r = -radius; r <= radius; r++) {
        const idx = i + r;
        if (idx >= 0 && idx < values.length) {
          sum += values[idx];
          count++;
        }
      }
      result.push(sum / count);
    }
    return result;
  }

  function setCanvasCssSize(pxHeight = 300) {
    if (!canvas) return;
    if (!canvas.style.height) canvas.style.height = `${pxHeight}px`;
    canvas.style.width = "100%";
  }

  onMount(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    setCanvasCssSize(300);

    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));
    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    const smoothedRaw = smooth(counts, 4).map(v => Math.max(0, v));

    // Compress the plotted values so the whole curve is visually smaller in Y
    const compressFactor = 0.5; // 0.4-0.6 is a good range; lower = flatter
    const smoothed = smoothedRaw.map(v => v * compressFactor);

    const rawMax = Math.max(...smoothed, 1);
    const suggestedMax = Math.ceil(rawMax * 1.05);

    // Ensure canvas internal resolution matches CSS size for crisp snapshot
    const cssW = canvas.clientWidth || canvas.offsetWidth || 600;
    const cssH = canvas.clientHeight || 300;
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
            ticks: {
              color: "#ffffff",
              font: { size: 12 }
            },
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

    // Snapshot after Chart paints. Slight delay ensures rendering finished.
    setTimeout(() => {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        if (blurImg && blurWrap) {
          blurImg.src = dataUrl;
          blurWrap.style.display = "block";

          // Align the snapshot exactly to the canvas container
          blurImg.style.left = "0";
          blurImg.style.top = "0";
          blurImg.style.width = "100%";
          blurImg.style.height = "100%";
          blurImg.style.opacity = "1";

          // Ensure wrapper covers canvas exactly
          blurWrap.style.left = "0";
          blurWrap.style.top = "0";
          blurWrap.style.width = "100%";
          blurWrap.style.height = "100%";

          // Force layout so transitions start from the correct state
          // eslint-disable-next-line no-unused-expressions
          blurImg.offsetHeight;
        }
      } catch (e) {
        console.warn("Canvas snapshot failed:", e);
        if (blurWrap) blurWrap.style.display = "none";
      }
    }, 120);
  });

  function reveal() {
    if (!blurWrap || !blurImg || !revealBtn) return;

    // Ensure transitions are set
    blurWrap.style.transition = "opacity 0.85s cubic-bezier(.2,.9,.2,1)";
    blurImg.style.transition = "opacity 0.85s cubic-bezier(.2,.9,.2,1)";

    // Use RAF to ensure starting state applied, then start fade
    requestAnimationFrame(() => {
      blurWrap.style.opacity = "0";
      blurImg.style.opacity = "0";
      revealBtn.style.transition = "opacity 0.28s ease";
      revealBtn.style.opacity = "0";
      revealBtn.style.pointerEvents = "none";
    });

    // Remove elements after animation completes
    setTimeout(() => {
      if (blurWrap) blurWrap.style.display = "none";
      if (blurImg) blurImg.style.display = "none";
      if (revealBtn) revealBtn.style.display = "none";
    }, 900);
  }
</script>

<div class="graph-wrapper">
  <div class="canvas-container">
    <!-- wrapper that holds the snapshot and the frosted overlays -->
    <div bind:this={blurWrap} class="blur-wrap" style="display:none; position:absolute; left:0; top:0;">
      <img
        bind:this={blurImg}
        id="graph-blur-image"
        class="blur-image"
        alt="blurred snapshot"
        style="position:absolute; left:0; top:0;"
      />

      <!-- Frosted glass overlays to create the "can't focus" look -->
      <div class="frost-overlay"></div>
      <div class="grain-overlay"></div>
    </div>

    <!-- The actual canvas -->
    <canvas bind:this={canvas}></canvas>
  </div>

  <!-- Reveal button sits above everything -->
  <button bind:this={revealBtn} class="reveal-btn" on:click={reveal}>
    Reveal Song Distribution Graph
  </button>
</div>

<style>
  .graph-wrapper {
    position: relative;
    width: 100%;
    max-width: 600px;
    margin: 2rem auto;
    min-height: 350px;
  }

  .canvas-container {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 300px;
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

  /* wrapper covering the canvas; we animate this wrapper's opacity as well as the image */
  .blur-wrap {
    z-index: 20;
    pointer-events: none;
    opacity: 1;
    will-change: opacity;
  }

  /* The snapshot image (base for the frosted effect) */
  .blur-image {
    z-index: 21;
    object-fit: cover;
    /* strong blur to remove detail */
    filter: blur(14px) contrast(0.85) saturate(0.85);
    opacity: 1;
    transition: opacity 0.85s cubic-bezier(.2,.9,.2,1);
    width: 100%;
    height: 100%;
    display: block;
    position: absolute;
    left: 0;
    top: 0;
  }

  /* A semi-opaque white overlay to create the frosted glass "wash" */
  .frost-overlay {
    position: absolute;
    inset: 0;
    z-index: 22;
    background: rgba(255,255,255,0.20); /* light white wash */
    mix-blend-mode: screen;
    pointer-events: none;
    backdrop-filter: none; /* avoid using backdrop-filter for animation reliability */
  }

  /* Grain/noise overlay to break up shapes and make details unreadable */
  .grain-overlay {
    position: absolute;
    inset: 0;
    z-index: 23;
    pointer-events: none;
    background-image:
      linear-gradient(transparent 0%, rgba(255,255,255,0.02) 1px),
      linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.02) 1px);
    background-size: 3px 3px, 4px 4px;
    opacity: 0.55;
    mix-blend-mode: overlay;
    filter: blur(0.6px);
  }

  /* Reveal button above everything */
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
