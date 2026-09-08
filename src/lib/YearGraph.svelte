<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;
  let blurImg;
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

  // Create a downscaled snapshot dataURL from the visible canvas.
  // scaleFactor: 0.12 => draw at 12% size (removes high-frequency detail)
  function createDownscaledDataUrl(srcCanvas, scaleFactor = 0.12) {
    try {
      const srcW = srcCanvas.width;
      const srcH = srcCanvas.height;
      const dstW = Math.max(1, Math.round(srcW * scaleFactor));
      const dstH = Math.max(1, Math.round(srcH * scaleFactor));

      const off = document.createElement("canvas");
      off.width = dstW;
      off.height = dstH;
      const ctx = off.getContext("2d");

      // draw scaled down (browser resamples)
      ctx.drawImage(srcCanvas, 0, 0, srcW, srcH, 0, 0, dstW, dstH);

      // export PNG data URL
      return off.toDataURL("image/png");
    } catch (e) {
      console.warn("Downscale snapshot failed", e);
      return null;
    }
  }

  function setCanvasCssSize(pxHeight = 320) {
    if (!canvas) return;
    canvas.style.width = "100%";
    if (!canvas.style.height) canvas.style.height = `${pxHeight}px`;
  }

  onMount(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    setCanvasCssSize(320);

    // Build years and counts
    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));
    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    // Smooth and compress the plotted values so the curve is visually smaller in Y
    const smoothedRaw = smooth(counts, 4).map(v => Math.max(0, v));
    const compressFactor = 0.5; // tune 0.4-0.7 for flatter/steeper
    const smoothed = smoothedRaw.map(v => v * compressFactor);

    const rawMax = Math.max(...smoothed, 1);
    const suggestedMax = Math.ceil(rawMax * 1.05);

    // Ensure canvas internal resolution matches CSS size for crisp drawing
    const cssW = canvas.clientWidth || canvas.offsetWidth || 600;
    const cssH = canvas.clientHeight || 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    // Create Chart.js chart
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
        // Create a downscaled data URL to remove high-frequency detail
        const downscaled = createDownscaledDataUrl(canvas, 0.12); // 12% size for strong diffusion
        if (downscaled && blurImg) {
          blurImg.src = downscaled;
          blurImg.style.display = "block";

          // Align the snapshot exactly to the canvas container
          blurImg.style.left = "0";
          blurImg.style.top = "0";
          blurImg.style.width = "100%";
          blurImg.style.height = "100%";
          blurImg.style.opacity = "1";

          // Ensure smooth resampling (avoid pixelated rendering)
          blurImg.style.imageRendering = "auto";

          // Force layout so transitions start from the correct state
          // eslint-disable-next-line no-unused-expressions
          blurImg.offsetHeight;
        }
      } catch (e) {
        console.warn("Snapshot failed:", e);
        if (blurImg) blurImg.style.display = "none";
      }
    }, 160);
  });

  function reveal() {
    if (!blurImg || !revealBtn) return;

    // Ensure transition is present
    blurImg.style.transition = "opacity 0.85s cubic-bezier(.2,.9,.2,1)";
    // Use RAF to ensure starting state applied, then start fade
    requestAnimationFrame(() => {
      blurImg.style.opacity = "0";
      revealBtn.style.transition = "opacity 0.28s ease";
      revealBtn.style.opacity = "0";
      revealBtn.style.pointerEvents = "none";
    });

    // Remove elements after animation completes
    setTimeout(() => {
      if (blurImg) blurImg.style.display = "none";
      if (revealBtn) revealBtn.style.display = "none";
    }, 920);
  }
</script>

<div class="graph-wrapper">
  <div class="canvas-container">
    <!-- Blurred downscaled snapshot image placed exactly over the canvas -->
    <img
      bind:this={blurImg}
      id="graph-blur-image"
      class="blur-image"
      alt="blurred snapshot"
      style="display:none; position:absolute; left:0; top:0;"
    />

    <!-- The actual canvas -->
    <canvas bind:this={canvas}></canvas>
  </div>

  <!-- Reveal button sits above the canvas and snapshot -->
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

  /* The downscaled snapshot image (base for the frosted effect) */
  .blur-image {
    z-index: 20;
    object-fit: fill; /* match canvas pixel mapping exactly */
    width: 100%;
    height: 100%;
    display: block;
    position: absolute;
    left: 0;
    top: 0;

    /* key: upscale blurred look (downscaled source + blur) */
    filter: blur(12px) saturate(0.85) contrast(0.92) brightness(0.92);

    /* minimal wash only; rely on blur to obscure detail */
    background: rgba(255,255,255,0.02);

    /* animate opacity */
    transition: opacity 0.85s cubic-bezier(.2,.9,.2,1);
    opacity: 1;
    pointer-events: none;
    will-change: opacity;
    image-rendering: auto;
    transform: translateZ(0); /* promote to its own layer for smooth opacity animation */
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
