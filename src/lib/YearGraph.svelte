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

  onMount(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    // Ensure canvas CSS height exists so layout is stable
    if (!canvas.style.height) canvas.style.height = "300px";

    // Build years and counts
    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));
    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    // Smooth and clamp
    const smoothed = smooth(counts, 4).map(v => Math.max(0, v));

    // Compute a compressed Y max (compress visually without adding empty space)
    const rawMax = Math.max(...counts, 1);
    // compress to ~60% of actual max (tune factor to taste)
    const compressFactor = 0.6;
    const suggestedMax = Math.max(Math.ceil(rawMax * compressFactor), 1);

    // Create Chart.js chart (Chart will handle devicePixelRatio internally)
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
            grid: { color: "rgba(255,255,255,0.15)" }
          },
          y: {
            ticks: { display: false },
            grid: { color: "rgba(255,255,255,0.10)" },
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
        if (blurImg) {
          blurImg.src = dataUrl;
          blurImg.style.display = "block";
          // Align the snapshot exactly to the canvas container
          blurImg.style.left = "0";
          blurImg.style.top = "0";
          blurImg.style.width = "100%";
          blurImg.style.height = "100%";
          blurImg.classList.remove("fade-out");
          blurImg.style.opacity = "1";
        }
      } catch (e) {
        console.warn("Canvas snapshot failed:", e);
        if (blurImg) blurImg.style.display = "none";
      }
    }, 120);
  });

  function reveal() {
    if (!blurImg || !revealBtn) return;

    // Fade the blurred snapshot image out smoothly
    blurImg.classList.add("fade-out");

    // Fade the button and disable it immediately
    revealBtn.classList.add("btn-fade");
    revealBtn.disabled = true;

    // Remove both after animation completes
    setTimeout(() => {
      if (blurImg) blurImg.style.display = "none";
      if (revealBtn) revealBtn.style.display = "none";
    }, 750);
  }
</script>

<div class="graph-wrapper">
  <div class="canvas-container">
    <!-- Blurred snapshot image placed exactly over the canvas -->
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

  /* Snapshot image sits exactly over the canvas */
  .blur-image {
    z-index: 20;
    object-fit: cover;
    filter: blur(4px) saturate(0.95) brightness(0.95);
    transition: opacity 0.72s cubic-bezier(.2,.9,.2,1);
    opacity: 1;
    pointer-events: none;
    will-change: opacity;
  }

  .blur-image.fade-out {
    opacity: 0;
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

  .reveal-btn.btn-fade {
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }
</style>
