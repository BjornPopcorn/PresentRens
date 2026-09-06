<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;

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

    // --- ULTRA SMOOTHING ---
    // Downsample into 12 buckets (like months)
    const bucketCount = 12;
    const bucketSize = Math.ceil(fullYears.length / bucketCount);

    const bucketYears = [];
    const bucketValues = [];

    for (let i = 0; i < bucketCount; i++) {
      const start = i * bucketSize;
      const end = start + bucketSize;

      const slice = counts.slice(start, end);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;

      bucketYears.push(fullYears[Math.floor((start + end) / 2)]); // mid-year
      bucketValues.push(Math.round(avg));
    }

    new Chart(canvas, {
      type: "line",
      data: {
        labels: bucketYears,
        datasets: [{
          label: "Song Trend",
          data: bucketValues,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.12)",
          tension: 0.9,        // maximum smoothness
          borderWidth: 3,
          pointRadius: 0,      // no dots
          fill: true           // soft fill
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false } // hide exact values
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
              callback: v => Math.round(v) // no decimals
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
