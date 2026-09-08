<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;
  let blurImg;
  let revealBtn;

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

  function setCanvasSizeForSnapshot() {
    // Ensure canvas CSS size is stable, then set internal pixel size for crisp snapshot
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    // Set internal resolution
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    // Keep CSS size unchanged
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  }

  onMount(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return;

    // Make sure canvas CSS size is set before Chart draws
    // If canvas has no explicit CSS height, set a default
    if (!canvas.style.height) canvas.style.height = "300px";

    // Set internal resolution for crisp snapshot
    setCanvasSizeForSnapshot();

    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));

    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);

    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    const smoothed = smooth(counts, 4).map(v => Math.max(0, v));

    // Create chart (Chart.js will draw into the high-DPI canvas)
    new Chart(canvas, {
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
              color: "white",
              font: { size: 12 }
            },
            grid: { color: "rgba(255,255,255,0.15)" }
          },
          y: {
            ticks: { display: false },
            grid: { color: "rgba(255,255,255,0.10)" },
            suggestedMax: 10,
            suggestedMin: 0
          }
        }
      }
    });

    // Snapshot after Chart paints. Slight delay ensures rendering finished.
    setTimeout(() => {
      try {
        // Create a data URL from the high-DPI canvas
        const dataUrl = canvas.toDataURL("image/png");
        if (blurImg) {
          // Place the snapshot into the image element and make it visible
          blurImg.src = dataUrl;
          blurImg.style.display = "block";
          // Ensure the image exactly matches the canvas CSS size and position
          blurImg.style.width = `${canvas.clientWidth}px`;
          blurImg.style.height = `${canvas.clientHeight}px`;
          blurImg.style.left = `${canvas.offsetLeft}px`;
          blurImg.style.top = `${canvas.offsetTop}px`;
          // Reset any fade class (in case of re-mount)
          blurImg.classList.remove("fade-out");
        }
      } catch (e) {
        // If toDataURL fails (tainted canvas), fall back to showing no snapshot.
        console.warn("Canvas snapshot failed:", e);
        if (blurImg) blurImg.style.display = "none";
      }
    }, 80);
  });

  function reveal() {
    if (!blurImg) return;
    // Fade the blurred snapshot image out smoothly
    blurImg.classList.add("fade-out");

    // Hide the button after starting the animation so it doesn't linger
    if (revealBtn) {
      revealBtn.style.pointerEvents = "none";
      revealBtn.classList.add("btn-fade");
    }

    // Remove elements after animation completes
    setTimeout(() => {
      if (blurImg) blurImg.style.display = "none";
      if (revealBtn) revealBtn.style.display = "none";
    }, 750);
  }
</script>

<div class="graph-wrapper">
  <div class="canvas-container">
    <!-- Blurred snapshot image placed inside the same container as the canvas so it lines up exactly -->
    <img
      bind:this={blurImg}
      id="graph-blur-image"
      class="blur-image"
      alt="blurred snapshot"
      style="display:none; position:absolute;"
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
    height: 300px; /* keep consistent with canvas CSS height */
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
    object-fit: cover;           /* cover ensures the snapshot fills the container */
    filter: blur(4px) saturate(0.95) brightness(0.95); /* softer blur, slight desaturate */
    transition: opacity 0.72s ease;
    opacity: 1;
    pointer-events: none;        /* allow clicks to pass through to the button */
  }

  .blur-image.fade-out {
    opacity: 0;
  }

  /* Reveal button above everything */
  .reveal-btn {
    position: absolute;
    top: calc(50% + 0px);
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
    transition: transform 0.18s ease, opacity 0.18s ease;
  }

  .reveal-btn:active {
    transform: translate(-50%, -50%) scale(0.96);
    opacity: 0.9;
  }

  .reveal-btn.btn-fade {
    opacity: 0;
    transition: opacity 0.4s ease;
  }
</style>
