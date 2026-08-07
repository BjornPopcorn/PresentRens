<script>
  // If you want to fetch songs from Supabase later, you can do it here.
</script>

<div class="page">
  <div class="glass">
    <h1>Present Rens</h1>
    <p class="subtitle">Scan a card. Guess the song. Have fun.</p>

    <div class="actions">
      <a href="/play/random" class="btn">Random Song</a>
      <a href="/songs" class="btn secondary">Song List</a>
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    background: linear-gradient(135deg, #1e1e2f, #3a3a5a);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
  }

  .glass {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 3rem;
    text-align: center;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 0 40px rgba(0,0,0,0.3);
  }

  h1 {
    font-size: 2.8rem;
    margin-bottom: 0.5rem;
    color: white;
  }

  .subtitle {
    color: #ddd;
    margin-bottom: 2rem;
    font-size: 1.2rem;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .btn {
    background: #ffffff15;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    color: white;
    font-size: 1.1rem;
    text-decoration: none;
    transition: 0.2s;
    border: 1px solid #ffffff30;
  }

  .btn:hover {
    background: #ffffff25;
  }

  .btn.secondary {
    background: #ffffff08;
  }
</style>
