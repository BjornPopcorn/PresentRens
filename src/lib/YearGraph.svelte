<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;

  // Gaussian blur helper
  function gaussianSmooth(values, radius = 3) {
    const kernel = [];
    const sigma = radius / 2;
    const twoSigmaSq = 2 * sigma * sigma;

    for (let i = -radius; i <= radius; i++) {
      kernel.push(Math.exp(-(i * i) / twoSigmaSq));
    }

    const kernelSum = kernel.reduce((a, b) => a + b, 0);
    const normalizedKernel = kernel.map(v => v / kernelSum);

    const result = [];

    for (let i = 0; i < values.length; i++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const idx = Math.min(values.length - 1, Math.max(0, i + k));
        sum += values[idx] * normalizedKernel[k + radius];
      }
      result.push(sum);
    }

    return result;
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

    // Normalize counts (0–1)
    const maxCount = Math.max(...counts);
    const normalized = counts.map(c => c / maxCount);

    // Apply Gaussian smoothing
    const blurred = gaussianSmooth(normalized, 4);

    // Blend blurred trend with real data (0.7 trend, 0.3 real)
    const blended = blurred.map((b, i) => {
      return Math.round((b * 0.7 + normalized[i] * 0.3) * maxCount);
    });

    new Chart(canvas, {
      type: "line",
      data: {
        labels: fullYears,
        datasets: [{
          label: "Song Trend",
          data: blended,
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
