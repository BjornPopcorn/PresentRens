<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;
  let blurImg;
  let revealBtn;
  let chartInstance;

  // smoothing helper (same as before)
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
    const smoothedRaw = smooth(counts, 4).map(v => Math.max(0, v));

    // Visual compression: scale the plotted values down so the whole curve is "flatter"
    // This reduces amplitude without adding empty space.
    const compressFactor = 0.55; // tune between 0.4 (very flat) and 0.8 (subtle)
    const smoothed = smoothedRaw.map(v => v * compressFactor);

    // Compute suggestedMax to match the visual scale (keeps graph compact)
    const rawMax = Math.max(...smoothed, 1);
    const suggestedMax = Math.ceil(rawMax * 1.05);

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
    // Use a short delay and then create a dataURL from the canvas.
    setTimeout(() => {
      try {
        // Ensure the canvas internal resolution is stable for crisp snapshot
        // (Chart.js already draws; toDataURL will capture what was drawn)
        const dataUrl = canvas.toDataURL("image/png");
        if (blurImg) {
          blurImg.src = dataUrl;
          blurImg.style.display = "block";
          // Make sure the snapshot covers the canvas exactly
          blurImg.style.left = "0";
          blurImg.style.top = "0";
          blurImg.style.width = "100%";
          blurImg.style.height = "100%";
          blurImg.style.opacity = "1";
          blurImg.classList.remove("fade-out");
          // Force a layout so subsequent opacity transitions are honored
          // (helps ensure the browser recognizes the starting opacity)
          // eslint-disable-next-line no-unused-expressions
          blurImg.offsetHeight;
        }
      } catch (e) {
        console.warn("Canvas snapshot failed:", e);
        if (blurImg) blurImg.style.display = "none";
      }
    }, 120);
  });

  function reveal() {
    if (!blurImg || !revealBtn) return;

    // Ensure transition is set (defensive)
    blurImg.style.transition = "opacity 0.8s cubic-bezier(.2,.9,.2,1)";
    // Force layout then start fade (use requestAnimationFrame to ensure browser applies starting state)
    requestAnimationFrame(() => {
      // start fade
      blurImg.style.opacity = "0";
      // fade the button slightly and then hide it
      revealBtn.style.transition = "opacity 0.28s ease";
      revealBtn.style.opacity = "0";
      revealBtn.style.pointerEvents = "none";
    });

    // After animation completes, remove elements so the canvas is fully visible and interactive
    setTimeout(() => {
      if (blurImg) blurImg.style.display = "none";
      if (revealBtn) revealBtn.style.display = "none";
    }, 820);
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
    /* stronger blur + darken overlay so underlying details are obscured */
    filter: blur(14px) saturate(0.9) brightness(0.85);
    transition: opacity 0.8s cubic-bezier(.2,.9,.2,1);
    opacity: 1;
    pointer-events: none;
    will-change: opacity;
    background: rgba(0,0,0,0.18); /* subtle darkening to hide details further */
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
</style>
