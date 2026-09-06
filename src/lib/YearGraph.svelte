<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;

  // Cubic Hermite spline interpolation
  function hermiteSpline(xs, ys, samples = 200) {
    const n = xs.length;
    const ms = new Array(n);

    // Compute tangents (finite differences)
    for (let i = 0; i < n; i++) {
      if (i === 0) {
        ms[i] = (ys[1] - ys[0]);
      } else if (i === n - 1) {
        ms[i] = (ys[n - 1] - ys[n - 2]);
      } else {
        ms[i] = (ys[i + 1] - ys[i - 1]) / 2;
      }
    }

    const resultX = [];
    const resultY = [];

    for (let i = 0; i < n - 1; i++) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const y0 = ys[i];
      const y1 = ys[i + 1];
      const m0 = ms[i];
      const m1 = ms[i + 1];

      for (let t = 0; t < samples; t++) {
        const u = t / samples;
        const h00 = (2*u*u*u - 3*u*u + 1);
        const h10 = (u*u*u - 2*u*u + u);
        const h01 = (-2*u*u*u + 3*u*u);
        const h11 = (u*u*u - u*u);

        resultX.push(x0 + (x1 - x0) * u);
        resultY.push(
          h00 * y0 +
          h10 * m0 +
          h01 * y1 +
          h11 * m1
        );
      }
    }

    return { xs: resultX, ys: resultY };
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

    // Reduce to anchor points (preserves dips)
    const anchorCount = 12;
    const segmentSize = Math.ceil(fullYears.length / anchorCount);

    const anchorYears = [];
    const anchorValues = [];

    for (let i = 0; i < anchorCount; i++) {
      const start = i * segmentSize;
      const end = Math.min(fullYears.length, start + segmentSize);
      const slice = counts.slice(start, end);

      // Use median instead of average or peak
      const sorted = [...slice].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      anchorYears.push(fullYears[Math.floor((start + end) / 2)]);
      anchorValues.push(median);
    }

    // Compute C² spline
    const spline = hermiteSpline(anchorYears, anchorValues, 40);

    new Chart(canvas, {
      type: "line",
      data: {
        labels: spline.xs,
        datasets: [{
          label: "Song Trend",
          data: spline.ys,
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.10)",
          tension: 0,          // spline already smooth
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
