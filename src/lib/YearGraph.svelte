<script>
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";

  const { data } = $props();
  let canvas;

  // Cubic Hermite spline interpolation (C² smooth)
  function hermiteSpline(xs, ys, samplesPerSegment = 200) {
    const n = xs.length;
    const ms = new Array(n);

    // Compute tangents
    for (let i = 0; i < n; i++) {
      if (i === 0) {
        ms[i] = ys[1] - ys[0];
      } else if (i === n - 1) {
        ms[i] = ys[n - 1] - ys[n - 2];
      } else {
        ms[i] = (ys[i + 1] - ys[i - 1]) / 2;
      }
    }

    const resultY = [];

    for (let i = 0; i < n - 1; i++) {
      const y0 = ys[i];
      const y1 = ys[i + 1];
      const m0 = ms[i];
      const m1 = ms[i + 1];

      for (let t = 0; t < samplesPerSegment; t++) {
        const u = t / samplesPerSegment;

        const h00 = 2*u*u*u - 3*u*u + 1;
        const h10 = u*u*u - 2*u*u + u;
        const h01 = -2*u*u*u + 3*u*u;
        const h11 = u*u*u - u*u;

        resultY.push(
          h00 * y0 +
          h10 * m0 +
          h01 * y1 +
          h11 * m1
        );
      }
    }

    return resultY;
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

    // Reduce to anchor points using medians
    const anchorCount = 20;
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

    // Compute spline Y-values only
    const splineY = hermiteSpline(
      [...Array(anchorCount).keys()], // fake X values: 0,1,2,3...
      anchorValues,
      40
    );

    // Clamp negative values
    const clampedY = splineY.map(v => Math.max(0, v));

    // Stretch spline Y-values to match number of real years
    const stretchedY = [];
    for (let i = 0; i < fullYears.length; i++) {
      const idx = Math.floor(i / fullYears.length * clampedY.length);
      stretchedY.push(clampedY[idx]);
    }

    new Chart(canvas, {
      type: "line",
      data: {
        labels: fullYears,   // REAL YEARS ONLY
        datasets: [{
          label: "Song Trend",
          data: stretchedY,  // SMOOTH SPLINE VALUES
          borderColor: "white",
          backgroundColor: "rgba(255,255,255,0.10)",
          tension: 0,        // spline already smooth
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
              callback: (v) => fullYears[v] // show whole years only
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

<canvas bind:this={canvas} width="600" height="300"></canvas>

<style>
  canvas {
    width: 100%;
    max-width: 600px;
    margin: 2rem auto;
  }
</style>
