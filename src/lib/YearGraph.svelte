<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();   // runes mode required
  let canvas;

  console.log("YearGraph.svelte: raw props data =", data);

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
    console.log("YearGraph.svelte: onMount triggered");
    console.log("YearGraph.svelte: canvas element =", canvas);
    console.log("YearGraph.svelte: data inside onMount =", data);

    if (!data) {
      console.log("YearGraph.svelte: data is NULL or UNDEFINED");
      return;
    }

    if (!Array.isArray(data)) {
      console.log("YearGraph.svelte: data is NOT an array. Actual type:", typeof data);
      return;
    }

    if (data.length === 0) {
      console.log("YearGraph.svelte: data is an EMPTY ARRAY");
      return;
    }

    console.log("YearGraph.svelte: data looks valid, building chart…");

    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));

    console.log("YearGraph.svelte: minYear =", minYear, "maxYear =", maxYear);

    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);

    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    console.log("YearGraph.svelte: counts =", counts);

    const smoothed = smooth(counts, 4).map(v => Math.max(0, v));

    console.log("YearGraph.svelte: smoothed =", smoothed);

    try {
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
          maintainAspectRatio: false,   // ← important
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

      console.log("YearGraph.svelte: Chart.js successfully initialized");
    } catch (err) {
      console.error("YearGraph.svelte: Chart.js ERROR:", err);
    }
  });

  function reveal() {
    console.log("YearGraph.svelte: reveal() called");

    const container = document.getElementById("canvas-container");
    const overlay = document.getElementById("graph-blur-overlay");

    console.log("YearGraph.svelte: container =", container);
    console.log("YearGraph.svelte: overlay =", overlay);

    container.classList.add("focused");
    overlay.classList.add("fade-out");

    setTimeout(() => {
      overlay.style.display = "none";
      console.log("YearGraph.svelte: overlay hidden");
    }, 600);
  }
</script>

<div class="graph-wrapper">
  <div style="background: red; padding: 20px; color: white;">
    IF YOU SEE THIS BOX, THE DOM IS VISIBLE!!!!!!!!
  </div>

  <div id="canvas-container" style="border: 3px solid lime; padding: 20px;">
    <canvas bind:this={canvas} style="border: 3px solid yellow;"></canvas>
  </div>
</div>

<style>
  .graph-wrapper {
    position: relative;
    width: 100%;
    max-width: 600px;
    margin: 2rem auto;
    overflow: hidden;
    outline: 2px solid red; /* DEBUG: show wrapper */
  }

  .canvas-container {
    position: relative;
    z-index: 1;
    filter: blur(35px);
    transition: filter 0.6s ease;
    outline: 2px solid blue; /* DEBUG: show canvas container */
  }

  .canvas-container.focused {
    filter: blur(0px);
  }

  .blur-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    background: rgba(0,0,0,0.15);
    transition: opacity 0.6s ease;
    outline: 2px solid green; /* DEBUG: show overlay */
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
  .graph-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 2rem auto;
  overflow: hidden;
  min-height: 350px; /* ← prevents jumping */
}

.canvas-container {
  min-height: 300px; /* ← ensures stable graph area */
}


  canvas {
    display: block;
    width: 100% !important;
    height: auto !important;   /* let Chart.js control internal height */
    max-width: 600px;
    margin: 2rem auto;
    outline: 2px solid yellow; /* DEBUG: show canvas */
  }
</style>
