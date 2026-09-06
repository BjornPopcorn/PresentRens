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
    // Compress into 6 trend points
    const bucketCount = 6;
    const bucketSize = Math.ceil(fullYears.length / bucketCount);

    const bucketYears = [];
    const bucketValues = [];

    for (let i = 0; i < bucketCount; i++) {
      const start = i * bucketSize;
      const end = start + bucketSize;

      const slice = counts.slice(start, end);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;

      bucketYears.push(fullYears[Math.floor((start + end) / 2)]);
      bucketValues.push(avg);
    }

    // Apply wide smoothing (Gaussian-like)
    const smoothValues = bucketValues.map((_, i) => {
      const window = [
        bucketValues[i - 2] ?? bucketValues[i],
        bucketValues[i - 1] ?? bucketValues[i],
        bucketValues[i],
        bucketValues[i + 1] ?? bucketValues[i],
        bucketValues[i + 2] ?? bucketValues[i]
      ];
      return Math.round(window.reduce((a, b) => a + b, 0) / window.length);
    });

    new Chart(canvas, {
      type: "line",
      data: {
        labels: bucketYears,
        datasets: [{
          label: "Song Trend",
          data: smoothValues,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.10)",
          tension: 1.0,        // maximum smoothness
          borderWidth: 3,
          pointRadius: 0,      // no dots
          fill: true           // soft fill
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
