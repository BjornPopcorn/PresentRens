<svelte:options runes={true} />

<script>
  // No props needed for a static page
</script>

<div class="rules-container">
  <h1>Game Rules</h1>

  <section>
    <h2>🎵 Objective</h2>
    <p>
      Place each song card in the correct position on the timeline based on its release date.
    </p>
  </section>

  <section>
    <h2>🃏 How to Play</h2>
    <ul>
      <li>Scan the QR code on a card to play the song.</li>
      <li>Guess where it fits on the timeline.</li>
      <li>Place it between the existing cards.</li>
      <li>Flip the card to check the date.</li>
      <li>If correct, keep the card. If wrong, discard it.</li>
    </ul>
  </section>

  <section>
    <h2>⭐ Steal Tokens</h2>
    <p>
      Each player starts with 2 steal tokens. Use a token to steal a card from another player
      when they place it correctly.
    </p>
  </section>

  <section>
    <h2>🏆 Winning</h2>
    <p>
      The first player to collect 10 cards wins the game.
    </p>
  </section>
</div>

<style>
  .rules-container {
    max-width: 700px;
    margin: 0 auto;
    padding: 2rem;
    line-height: 1.6;
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
  }

  section {
    margin-bottom: 2rem;
  }

  ul {
    padding-left: 1.2rem;
  }
</style>
