<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;

  // C² Hermite spline
  function hermiteSpline(xs, ys, outputCount) {
    const n = xs.length;
    const ms = new Array(n);

    // Tangents
    for (let i = 0; i < n; i++) {
      if (i === 0) ms[i] = ys[1] - ys[0];
      else if (i === n - 1) ms[i] = ys[n - 1] - ys[n - 2];
      else ms[i] = (ys[i + 1] - ys[i - 1]) / 2;
    }

    const result = [];

    for (let k = 0; k < outputCount; k++) {
      const t = k / (outputCount - 1); // 0 → 1
      const pos = t * (n - 1);
      const i = Math.floor(pos);
      const u = pos - i;

      const y0 = ys[i];
      const y1 = ys[i + 1] ?? ys[i];
      const m0 = ms[i];
      const m1 = ms[i + 1] ?? ms[i];

      const h00 = 2*u*u*u - 3*u*u + 1;
      const h10 = u*u*u - 2*u*u + u;
      const h01 = -2*u*u*u + 3*u*u;
      const h11 = u*u*u - u*u;

      const y = h00*y0 + h10*m0 + h01*y1 + h11*m1;
      result.push(Math.max(0, y)); // clamp at 0
    }

    return result;
  }

  onMount(() => {
    if (!data || !Array.isArray(data)) return;

    // Full year range
    const minYear = Math.min(...data.map(d => d.year));
    const maxYear = Math.max(...data.map(d => d.year));

    const fullYears = [];
    for (let y = minYear; y <= maxYear; y++) fullYears.push(y);

    // Fill missing years with 0
    const countMap = new Map(data.map(d => [d.year, d.count]));
    const counts = fullYears.map(y => countMap.get(y) || 0);

    // Reduce to anchor points using medians
    const anchorCount = 16;
    const segmentSize = Math.ceil(fullYears.length / anchorCount);

    const anchorValues = [];
    for (let i = 0; i < anchorCount; i++) {
      const start = i * segmentSize;
      const end = Math.min(fullYears.length, start + segmentSize);
      const slice = counts.slice(start, end);

      const sorted = [...slice].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      anchorValues.push(median);
    }

    // Generate EXACTLY one spline value per year
    const splineY = hermiteSpline(
      [...Array(anchorCount).keys()],
      anchorValues,
      fullYears.length
    );

    new Chart(canvas, {
      type: "line",
      data: {
        labels: fullYears,
        datasets: [{
          label: "Song Trend",
          data: splineY,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.10)",
          tension: 0, // spline is already smooth
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
              callback: (_, i) => fullYears[i]
            },
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

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    width: 100%;
    max-width: 600px;
    margin: 2rem auto;
  }
</style>
