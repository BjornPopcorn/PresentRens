<script>
  import AudioPlayer from '$lib/AudioPlayer.svelte';

  const { data } = $props();
  const song = data.song;

  // Multiple beautiful gradient palettes
  const gradientSets = [
    ["#ff5f6d", "#ffc371", "#00c6ff", "#0072ff"],
    ["#f953c6", "#b91d73", "#43e97b", "#38f9d7"],
    ["#fa709a", "#fee140", "#6a11cb", "#2575fc"],
    ["#009fff", "#ec2f4b", "#ff9966", "#ff5e62"],
    ["#f12711", "#f5af19", "#8360c3", "#2ebf91"]
  ];

  // Pick one palette at random
  const colors = gradientSets[Math.floor(Math.random() * gradientSets.length)];

  // Build the gradient string dynamically
  const gradientString = `linear-gradient(135deg, ${colors.join(", ")})`;
</script>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: black;
  }

  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;

    background: var(--gradient);
    background-size: 400% 400%;
    animation: gradientShift 2000s ease-in-out infinite;
  }

  @keyframes gradientShift {
    0% { background-position: 45% 50%; }
    50% { background-position: 55% 50%; }
    100% { background-position: 45% 50%; }
  }

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

    .page {
      padding: 1rem;
    }
  }
</style>

<div class="page" style="--gradient: {gradientString}">
  <div class="glass">
    <AudioPlayer src={song.audio_url} />
  </div>
</div>
