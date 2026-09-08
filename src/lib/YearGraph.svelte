<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;
  let snapImg;
  let snapWrap;
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
    const compressFactor = 0.5;
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
        if (snapImg && snapWrap) {
          snapImg.src = dataUrl;
          snapWrap.style.display = "block";

          // Align snapshot exactly to the canvas container
          snapImg.style.left = "0";
          snapImg.style.top = "0";
          snapImg.style.width = "100%";
          snapImg.style.height = "100%";
          snapImg.style.opacity = "1";

          snapWrap.style.left = "0";
          snapWrap.style.top = "0";
          snapWrap.style.width = "100%";
          snapWrap.style.height = "100%";

          // Force layout so transitions start from the correct state
          // eslint-disable-next-line no-unused-expressions
          snapImg.offsetHeight;
        }
      } catch (e) {
        console.warn("Canvas snapshot failed:", e);
        if (snapWrap) snapWrap.style.display = "none";
      }
    }, 120);
  });

  function reveal() {
    if (!snapWrap || !snapImg || !revealBtn) return;

    // Ensure transitions are set
    snapWrap.style.transition = "opacity 0.85s cubic-bezier(.2,.9,.2,1)";
    snapImg.style.transition = "opacity 0.85s cubic-bezier(.2,.9,.2,1)";

    // Use RAF to ensure starting state applied, then start fade
    requestAnimationFrame(() => {
      snapWrap.style.opacity = "0";
      snapImg.style.opacity = "0";
      revealBtn.style.transition = "opacity 0.28s ease";
      revealBtn.style.opacity = "0";
      revealBtn.style.pointerEvents = "none";
    });

    // Remove elements after animation completes
    setTimeout(() => {
      if (snapWrap) snapWrap.style.display = "none";
      if (snapImg) snapImg.style.display = "none";
      if (revealBtn) revealBtn.style.display = "none";
    }, 900);
  }
</script>

<!-- SVG filter defs: strong gaussian blur + desaturate + contrast reduction -->
<svg style="position:absolute; width:0; height:0; pointer-events:none;" aria-hidden="true">
  <defs>
    <filter id="frostFilter" x="-20%" y="-20%" width="140%" height="140%">
      <!-- blur -->
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blurred"/>
      <!-- desaturate -->
      <feColorMatrix in="blurred" type="saturate" values="0.25" result="desat"/>
      <!-- reduce contrast slightly -->
      <feComponentTransfer in="desat" result="contrast">
        <feFuncR type="linear" slope="0.95" intercept="-0.03"/>
        <feFuncG type="linear" slope="0.95" intercept="-0.03"/>
        <feFuncB type="linear" slope="0.95" intercept="-0.03"/>
      </feComponentTransfer>
      <!-- subtle edge softening -->
      <feBlend in="SourceGraphic" in2="contrast" mode="screen" result="blendOut"/>
    </filter>
  </defs>
</svg>

<div class="graph-wrapper">
  <div class="canvas-container">
    <!-- wrapper that holds the snapshot and frosted overlays -->
    <div bind:this={snapWrap} class="snap-wrap" style="display:none; position:absolute; left:0; top:0;">
      <!-- snapshot image with SVG filter applied -->
      <img
        bind:this={snapImg}
        id="graph-snap-image"
        class="snap-image"
        alt="snapshot"
        style="position:absolute; left:0; top:0;"
      />

      <!-- semi-white wash to mimic frosted glass scattering -->
      <div class="frost-overlay"></div>

      <!-- grain/noise overlay to break up shapes and make details unreadable -->
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
  .snap-wrap {
    z-index: 20;
    pointer-events: none;
    opacity: 1;
    will-change: opacity;
  }

  /* The snapshot image (base for the frosted effect) */
  .snap-image {
    z-index: 21;
    object-fit: cover;
    width: 100%;
    height: 100%;
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    /* apply SVG filter for true frosted diffusion + desaturation + contrast tweak */
    filter: url('#frostFilter');
    opacity: 1;
    transition: opacity 0.85s cubic-bezier(.2,.9,.2,1);
  }

  /* A semi-opaque white overlay to create the frosted glass wash (subtle scattering) */
  .frost-overlay {
    position: absolute;
    inset: 0;
    z-index: 22;
    background: rgba(255,255,255,0.14);
    mix-blend-mode: screen;
    pointer-events: none;
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
