<svelte:options runes={true} />

<script>
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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

  :global(body) {
    margin: 0;
    padding: 0;
    background: black;
    font-family: 'Inter', sans-serif;
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
    max-width: 650px;
    width: 100%;
    color: white;
    box-shadow: 0 20px 40px rgba(0,0,0,0.25);
  }

  h1 {
    text-align: center;
    margin-bottom: 2.5rem;
    font-size: 2.2rem;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .section {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 0.8rem;
    letter-spacing: -0.3px;
  }

  .divider {
    height: 1px;
    background: rgba(255,255,255,0.15);
    margin: 1.5rem 0;
  }

  p, li {
    font-size: 1.05rem;
    line-height: 1.65;
    font-weight: 300;
  }

  ul {
    padding-left: 1.2rem;
  }

  @media (max-width: 600px) {
    .glass {
      padding: 1.5rem;
      border-radius: 16px;
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.25);
    }

    h1 {
      font-size: 1.7rem;
    }

    .section-title {
      font-size: 1.15rem;
    }

    p, li {
      font-size: 0.95rem;
    }
  }
</style>

<div class="page" style="--gradient: {gradientString}">
  <div class="glass">
    <h1>Game Rules</h1>

    <div class="section">
      <div class="section-title">Objective</div>
      <p>
        Build your timeline by placing each song card in the correct chronological position. 
        Every player starts with one card face-up in front of them — this is the beginning of their timeline.
      </p>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">How to Play</div>
      <ul>
        <li>Scan the QR code on a card to play the song.</li>
        <li>Decide where the card fits relative to the dates already in your timeline.</li>
        <li>Place the card in that position.</li>
        <li>Flip the card to reveal the date.</li>
        <li>If correct, add it to your timeline. If incorrect, discard the card.</li>
      </ul>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">Steal Tokens</div>
      <p>Each player starts with 2 steal tokens. You can use them in three ways:</p>
      <ul>
        <li><strong>Correct a mistake:</strong> If another player places a card incorrectly, you may place a token and show the correct position. You steal the card.</li>
        <li><strong>Trade for a free card:</strong> Exchange 4 tokens for a guaranteed correct card. Add it directly to your timeline.</li>
        <li><strong>Refresh your card:</strong> On your turn, spend 1 token to discard your current card and draw a new one.</li>
      </ul>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="section-title">Winning</div>
      <p>
        The first player to collect 10 correct cards wins the game.
      </p>
    </div>
  </div>
</div>
