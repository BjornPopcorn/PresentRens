<script>
  const { data } = $props();
  const song = data.song;
</script>

<style>
  /* Remove browser white border */
  :global(body) {
    margin: 0;
    padding: 0;
    background: black;
  }

  /* Animated gradient background */
  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;

    background: linear-gradient(135deg, #ff5f6d, #ffc371, #00c6ff, #0072ff);
    background-size: 400% 400%;
    animation: gradientShift 60s ease infinite;
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* Glass card */
  .glass {
    backdrop-filter: blur(25px);
    background: rgba(255, 255, 255, 0.10);
    border-radius: 24px;
    padding: 2.5rem;
    max-width: 480px;
    width: 100%;
    text-align: center;

    border: none;
    box-shadow: 0 20px 40px rgba(0,0,0,0.25);
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

  /* Mobile-first improvements */
  @media (max-width: 600px) {
    .glass {
      padding: 1.5rem;
      border-radius: 16px;
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.25);
    }

    p {
      font-size: 1rem;
      margin-bottom: 1.2rem;
    }

    audio {
      width: 100%;
      margin-top: 0.5rem;
    }

    .page {
      padding: 1rem;
    }
  }
</style>

<div class="page">
  <div class="glass">
    <p>Press play below</p>
    <audio controls src={song.audio_url}></audio>
  </div>
</div>
