<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();   // ← runes mode required
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
    if (!data || !Array.isArray(data)) return;

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
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: {
            ticks: {
              color: "white",
              autoSkip: false,
              callback: (value, index) => index % 2 === 0 ? years[index] : ""
            },
            grid: { color: "rgba(255,255,255,0.1)" }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "white",
              precision: 0
            },
            grid: { color: "rgba(255,255,255,0.1)" }
          }
        }
      }
    });
  });

  function reveal() {
    const overlay = document.getElementById("graph-blur-overlay");
    overlay.classList.add("fade-out");

    setTimeout(() => {
      overlay.style.display = "none";
    }, 400);
  }
</script>

<div class="graph-wrapper">
  <div id="graph-blur-overlay" class="blur-overlay">
    <button class="reveal-btn" on:click={reveal}>
      Reveal Song Distribution Graph
    </button>
  </div>

  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .graph-wrapper {
    position: relative;
    width: 100%;
    max-width: 600px;
    margin: 2rem auto;
  }

  .blur-overlay {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(500px);
    -webkit-backdrop-filter: blur(30px);
    background: rgba(0,0,0,0.05);   /* ← VERY light tint */
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    transition: opacity 0.6s ease, backdrop-filter 0.6s ease;
    z-index: 10;
  }


  .fade-out {
    opacity: 0;
    backdrop-filter: blur(0px);      /* blur animates away */
    -webkit-backdrop-filter: blur(0px);
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
    max-width: 600px;
    margin: 2rem auto;
  }
</style>
