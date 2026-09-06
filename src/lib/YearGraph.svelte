<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;

  // Simple LOWESS smoothing
  function lowess(x, y, f = 0.25) {
    const n = x.length;
    const r = Math.floor(n * f);
    const ySmooth = [];

    for (let i = 0; i < n; i++) {
      const left = Math.max(0, i - r);
      const right = Math.min(n - 1, i + r);

      const windowX = x.slice(left, right + 1);
      const windowY = y.slice(left, right + 1);

      const avg = windowY.reduce((a, b) => a + b, 0) / windowY.length;
      ySmooth.push(avg);
    }

    return ySmooth;
  }

  onMount(() => {
    if (!data || !Array.isArray(data)) return;

    // Build full year range
    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));

    const fullYears = [];
    for (let y = minYear; y <= maxYear; y++) {
      fullYears.push(y);
    }

    // Fill missing years with 0
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = fullYears.map(y => countMap.get(y) || 0);

    // Apply LOWESS smoothing
    const smoothCounts = lowess(fullYears, counts, 0.35);

    new Chart(canvas, {
      type: "line",
      data: {
        labels: fullYears,
        datasets: [{
          label: "Song Trend",
          data: smoothCounts,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.10)",
          tension: 0.9,
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
            ticks: { color: "white" },
            grid: { color: "rgba(255,255,255,0.1)" }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "white",
              callback: v => Math.round(v)
            },
            grid: { color: "rgba(255,255,255,0.1)" }
          }
        }
      }
    });
  });
</script>

<canvas bind:this={canvas} width="600" height="300"></canvas>

<style>
  canvas {
    width: 100%;
    max-width: 600px;
    margin: 2rem auto;
  }
</style>
