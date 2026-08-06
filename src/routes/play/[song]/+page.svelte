<script>
  const { data } = $props();
  const song = data.song;

  // Stronger, more dramatic gradients
  function randomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }

  let gradient = `linear-gradient(135deg, ${randomColor()} 0%, ${randomColor()} 100%)`;

</script>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--gradient);
    transition: background 1s ease;
  }

  .glass {
    backdrop-filter: blur(30px);
    background: rgba(255, 255, 255, 0.10);
    border-radius: 24px;
    padding: 3rem;
    max-width: 500px;
    width: 100%;
    text-align: center;

    /* Removed border completely */
    border: none;

    /* Premium glass effect */
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.1),
      0 20px 40px rgba(0,0,0,0.25);
  }

  p {
    color: white;
    font-size: 1.2rem;
    margin-bottom: 2rem;
  }

  audio {
    width: 100%;
    margin-top: 1rem;
  }
</style>

<div class="page" style="--gradient: {gradient}">
  <div class="glass">
    <!-- Title removed -->
    <p>Press play below</p>

    <audio controls src={song.audio_url}></audio>
  </div>
</div>
