<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  // DOM-only props: Svelte 5 runes mode safe
  const { data } = $props();

  let canvas;

  onMount(() => {
    // Defensive: ensure data exists
    if (!data || !Array.isArray(data)) return;

    const years = data.map(d => d.year);
    const counts = data.map(d => d.count);

    new Chart(canvas, {
      type: "line",
      data: {
        labels: years,
        datasets: [{
          label: "Songs per year",
          data: counts,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.2)",
          tension: 0.4, // smooth curve
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: "white"
        }]
      },
      options: {
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: "white" },
            grid: { color: "rgba(255,255,255,0.1)" }
          },
          y: {
            ticks: { color: "white" },
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
