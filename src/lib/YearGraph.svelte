<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;
  let blurImg; // reference to the snapshot image element

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

    // match canvas internal resolution to CSS size
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    // scale drawing context if you draw manually; Chart.js handles DPI if configured,
    // but setting canvas size like this ensures the snapshot is crisp.
    canvas.style.width = `${canvas.clientWidth}px`;
    canvas.style.height = `${canvas.clientHeight}px`;

    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));

    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);

    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    const smoothed = smooth(counts, 4).map(v => Math.max(0, v));

    // Create chart
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
            // flatten the graph visually; tune this value
            suggestedMax: 10,
            suggestedMin: 0
          }
        }
      }
    });

    // Snapshot after a short delay so Chart has painted
    setTimeout(() => {
      if (!canvas) return;
      try {
        const dataUrl = canvas.toDataURL("image/png");
        if (blurImg) {
          blurImg.src = dataUrl;
          // ensure image is visible and fully opaque initially
          blurImg.style.opacity = "1";
          blurImg.style.display = "block";
        }
      } catch (e) {
        // toDataURL can fail if canvas is tainted; in that case fallback to non-snapshot approach
        console.warn("Snapshot failed:", e);
      }
    }, 80);
  });

  function reveal() {
    // fade the blurred image out (animate opacity)
    if (!blurImg) return;
    blurImg.classList.add("fade-out");
    // remove from flow after animation completes
    setTimeout(() => {
      blurImg.style.display = "none";
    }, 700);
  }
</script>

<div class="graph-wrapper">
  <!-- Blurred snapshot image sits above the canvas and is animated -->
  <img bind:this={blurImg} id="graph-blur-image" class="blur-image" alt="blurred snapshot" />

  <!-- Canvas underneath -->
  <div class="canvas-container">
    <canvas bind:this={canvas}></canvas>
  </div>

  <!-- Reveal button sits above the image -->
  <button class="reveal-btn" on:click={reveal}>
    Reveal Song Distribution Graph
  </button>
</div>

<!-- small test box to confirm animations work -->
<div class="test-box">Hover me to test animation</div>

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
  }

  canvas {
    width: 100%;
    height: 300px;
    display: block;
    background: transparent;
  }

  /* Blurred snapshot image */
  .blur-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(5px);               /* softer blur; tune as needed */
    opacity: 1;
    transition: opacity 0.7s ease;   /* animate opacity on the image itself */
    z-index: 20;
    display: none;                   /* hidden until snapshot is set */
    pointer-events: none;            /* let clicks pass through to button if needed */
  }

  .blur-image.fade-out {
    opacity: 0;
  }

  /* Button above everything */
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
    transition: transform 0.18s ease, opacity 0.18s ease;
  }

  .reveal-btn:active {
    transform: translate(-50%, -50%) scale(0.96);
    opacity: 0.9;
  }

  /* Test box to confirm animations */
  .test-box {
    width: 160px;
    padding: 0.8rem;
    margin: 1rem auto;
    background: #e11;
    color: white;
    text-align: center;
    border-radius: 8px;
    opacity: 1;
    transition: opacity 1.6s ease;
  }

  .test-box:hover {
    opacity: 0;
  }
</style>
