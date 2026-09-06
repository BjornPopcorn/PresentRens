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

    // --- REDUCE TO ANCHOR POINTS USING PEAKS ---
    const anchorCount = 8; // smooth but meaningful
    const segmentSize = Math.ceil(fullYears.length / anchorCount);

    const anchorYears = [];
    const anchorValues = [];

    for (let i = 0; i < anchorCount; i++) {
      const start = i * segmentSize;
      const end = Math.min(fullYears.length, start + segmentSize);

      const slice = counts.slice(start, end);

      // Use PEAK instead of average
      const peak = Math.max(...slice);

      anchorYears.push(fullYears[Math.floor((start + end) / 2)]);
      anchorValues.push(peak);
    }

    new Chart(canvas, {
      type: "line",
      data: {
        labels: anchorYears,
        datasets: [{
          label: "Song Trend",
          data: anchorValues,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.10)",
          tension: 1.0,        // maximum smoothness
          borderWidth: 3,
          pointRadius: 0,      // hide anchor points
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
