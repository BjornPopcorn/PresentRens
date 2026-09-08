<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;

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

    // Ensure canvas internal resolution matches CSS size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));

    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);

    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    const smoothed = smooth(counts, 4).map(v => Math.max(0, v));

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
        }
      }
    });
  });

  function reveal() {
    const container = document.getElementById("canvas-container");
    const overlay = document.getElementById("graph-blur-overlay");

    container.classList.add("focused");
    overlay.classList.add("fade-out");

    setTimeout(() => {
      overlay.style.display = "none";
    }, 600);
  }
</script>

<div class="graph-wrapper">
  <div id="graph-blur-overlay" class="blur-overlay">
    <button class="reveal-btn" on:click={reveal}>
      Reveal Song Distribution Graph
    </button>
  </div>

  <div id="canvas-container" class="canvas-container">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .graph-wrapper {
    position: relative;
    width: 100%;
    max-width: 600px;
    margin: 2rem auto;
    min-height: 350px;
    z-index: 5; /* chart sits above your glass background */
  }

  /* ⭐ Blur applied BEFORE clicking */
  .canvas-container {
    filter: blur(35px);
    transition: filter 0.6s ease;
    min-height: 300px;
    position: relative;
    z-index: 10; /* chart above background */
  }

  /* ⭐ Blur removed AFTER clicking */
  .canvas-container.focused {
    filter: none;
  }

  /* Overlay sits ABOVE chart */
  .blur-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    background: rgba(0,0,0,0.25);
    backdrop-filter: blur(4px);
    transition: opacity 0.6s ease;
  }

  .fade-out {
    opacity: 0;
  }

  .reveal-btn {
    padding: 0.8rem 1.2rem;
    border-radius: 8px;
    background: white;
    color: black;
    font-weight: 600;
    cursor: pointer;
    border: none;
  }

  canvas {
    width: 100%;
    height: 300px;
    display: block;
  }
</style>
