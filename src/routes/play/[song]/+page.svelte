<script>
  const { data } = $props();
  const song = data.song;

  const gradients = [
    "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)"
  ];

  let gradient = gradients[Math.floor(Math.random() * gradients.length)];
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
    backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    padding: 3rem;
    max-width: 500px;
    width: 100%;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  }

  h1 {
    color: white;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
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
    <h1>{song.title}</h1>
    <p>Press play below</p>

    <audio controls src={song.audio_url}></audio>
  </div>
</div>
<!-- trigger production deploy -->
