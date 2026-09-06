<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;

  // Simple Gaussian-like smoothing over the raw counts
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

    // Full year range
    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));

    const years = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);

    // Fill missing years with 0
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = years.map(y => countMap.get(y) || 0);

    // Smooth but still aligned 1:1 with years
    const smoothed = smooth(counts, 4).map(v => Math.max(0, v)); // clamp at 0

    new Chart(canvas, {
      type: "line",
      data: {
        labels: years,          // real years, no tricks
        datasets: [{
          label: "Song Trend",
          data: smoothed,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.10)",
          tension: 0.6,         // smooth curve
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
                callback: (value, index) => {
                  // show every 2nd year
                  return index % 2 === 0 ? fullYears[index] : "";
                }
              },
              grid: { color: "rgba(255,255,255,0.1)" }
            }
          ,
          y: {
            beginAtZero: true,
            ticks: {
              color: "white",
              callback: v => Math.round(v) // no decimals
            },
            grid: { color: "rgba(255,255,255,0.1)" }
          }
        }
      }
    });
  });
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    width: 100%;
    max-width: 600px;
    margin: 2rem auto;
  }
</style>
