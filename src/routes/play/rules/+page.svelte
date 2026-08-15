<svelte:options runes={true} />

<script>
  // Same gradient system as your player page
  const gradientSets = [
    ["#ff5f6d", "#ffc371", "#00c6ff", "#0072ff"],
    ["#f953c6", "#b91d73", "#43e97b", "#38f9d7"],
    ["#fa709a", "#fee140", "#6a11cb", "#2575fc"],
    ["#009fff", "#ec2f4b", "#ff9966", "#ff5e62"],
    ["#f12711", "#f5af19", "#8360c3", "#2ebf91"]
  ];

  const colors = gradientSets[Math.floor(Math.random() * gradientSets.length)];
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
    animation: gradientShift 500s ease-in-out infinite;
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
    max-width: 600px;
    width: 100%;
    color: white;
    box-shadow: 0 20px 40px rgba(0,0,0,0.25);
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2rem;
  }

  h2 {
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    font-size: 1.4rem;
  }

  p, li {
    font-size: 1.1rem;
    line-height: 1.6;
  }

  ul {
    padding-left: 1.4rem;
  }

  @media (max-width: 600px) {
    .glass {
      padding: 1.5rem;
      border-radius: 16px;
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.25);
    }

    h1 {
      font-size: 1.6rem;
    }

    h2 {
      font-size: 1.2rem;
    }

    p, li {
      font-size: 1rem;
    }
  }
</style>

<div class="page" style="--gradient: {gradientString}">
  <div class="glass">
    <h1>Game Rules</h1>

    <h2>🎵 Objective</h2>
    <p>
      Place each song card in the correct position on the timeline based on its release date.
    </p>

    <h2>🃏 How to Play</h2>
    <ul>
      <li>Scan the QR code on a card to play the song.</li>
      <li>Guess where it fits on the timeline.</li>
      <li>Place it between the existing cards.</li>
      <li>Flip the card to check the date.</li>
      <li>If correct, keep the card. If wrong, discard it.</li>
    </ul>

    <h2>⭐ Steal Tokens</h2>
    <p>
      Each player starts with 2 steal tokens. Use a token to steal a card from another player
      when they place it correctly.
    </p>

    <h2>🏆 Winning</h2>
    <p>
      The first player to collect 10 cards wins the game.
    </p>
  </div>
</div>
