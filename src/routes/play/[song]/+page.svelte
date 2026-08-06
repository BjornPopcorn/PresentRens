<script>
  const { data } = $props();
  const song = data.song;

  // Stronger, more dramatic gradients
  const gradients = [
  // Neon & punchy
  "linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)",
  "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
  "linear-gradient(135deg, #f953c6 0%, #b91d73 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",

  // Deep & dramatic
  "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
  "linear-gradient(135deg, #009fff 0%, #ec2f4b 100%)",
  "linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)",
  "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
  "linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)",

  // Soft but still clean
  "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)"
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
