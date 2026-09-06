<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;

  onMount(() => {
    if (!data || !Array.isArray(data)) return;

    // 1. Build a full year range (min → max)
    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));

    const fullYears = [];
    for (let y = minYear; y <= maxYear; y++) {
      fullYears.push(y);
    }

    // 2. Map counts into the full range (fill missing years with 0)
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = fullYears.map(y => countMap.get(y) || 0);

    // 3. Smooth the line using a moving average
    const smoothCounts = counts.map((_, i) => {
      const window = [
        counts[i - 1] ?? counts[i],
        counts[i],
        counts[i + 1] ?? counts[i]
      ];
      return Math.round(window.reduce((a, b) => a + b, 0) / window.length);
    });

    new Chart(canvas, {
      type: "line",
      data: {
        labels: fullYears,
        datasets: [{
          label: "Song Trend",
          data: smoothCounts,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.15)",
          tension: 0.6,        // smoother curve
          borderWidth: 3,
          pointRadius: 0,      // hide points for cleaner trend
          fill: true           // soft gradient fill
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false     // hide exact numbers
          }
        },
        scales: {
          x: {
            ticks: { color: "white" },
            grid: { color: "rgba(255,255,255,0.1)" }
          },
          y: {
            ticks: {
              color: "white",
              callback: v => Math.round(v)   // no decimals
            },
            grid: { color: "rgba(255,255,255,0.1)" },
            beginAtZero: true
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
