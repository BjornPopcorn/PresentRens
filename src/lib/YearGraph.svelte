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
  });

  function reveal() {
    const wrapper = document.getElementById("blur-wrapper");
    wrapper.classList.add("fade-out");

    setTimeout(() => {
      wrapper.style.display = "none";
    }, 800);
  }
</script>

<div class="graph-wrapper">

  <!-- ⭐ Wrapper that will animate -->
  <div id="blur-wrapper" class="blur-wrapper">
    <div class="blur-overlay"></div>
    <button class="reveal-btn" on:click={reveal}>
      Reveal Song Distribution Graph
    </button>
  </div>

  <div class="canvas-container">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<!-- Animation test box -->
<div class="test-box">Hover me</div>

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
  }

  /* ⭐ Wrapper fades (NOT the blur itself) */
  .blur-wrapper {
    position: absolute;
    inset: 0;
    z-index: 20;
    opacity: 1;
    transition: opacity 0.8s ease;
  }

  .fade-out {
    opacity: 0;
  }

  /* ⭐ Blur stays intact inside wrapper */
  .blur-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(6px);
  }

  /* ⭐ Button above blur */
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

    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  .reveal-btn:active {
    transform: translate(-50%, -50%) scale(0.96);
    opacity: 0.85;
  }

  /* ⭐ Animation test box */
  .test-box {
    width: 140px;
    padding: 1rem;
    margin: 1rem auto;
    background: red;
    color: white;
    text-align: center;
    border-radius: 8px;

    opacity: 1;
    transition: opacity 2s ease;
  }

  .test-box:hover {
    opacity: 0;
  }
</style>
