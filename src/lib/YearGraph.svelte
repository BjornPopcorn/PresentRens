<div class="graph-wrapper">
  <div id="graph-blur-overlay" class="blur-overlay">
    <button class="reveal-btn" on:click={reveal}>
      Reveal Song Distribution Graph
    </button>
  </div>

  <div class="canvas-container">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
.graph-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 2rem auto;
  min-height: 350px;
}

/* ⭐ Guaranteed blur using a pseudo-element */
.blur-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  transition: opacity 0.6s ease;
}

/* ⭐ This pseudo-element blurs EVERYTHING behind it */
.blur-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;

  /* ⭐ Transparent background so blur shows */
  background: rgba(255,255,255,0.05);

  /* ⭐ Guaranteed blur */
  filter: blur(25px);

  transition: opacity 0.6s ease;
}

/* Keep the button crisp */
.blur-overlay > .reveal-btn {
  filter: none;
  position: relative;
  z-index: 21;
}

.fade-out {
  opacity: 0;
}

.canvas-container {
  position: relative;
  z-index: 1;
}

canvas {
  width: 100%;
  height: 300px;
  display: block;
}

.reveal-btn {
  padding: 0.8rem 1.2rem;
  border-radius: 8px;
  background: white;
  color: black;
  font-weight: 600;
  cursor: pointer;
  border: none;
}
</style>
