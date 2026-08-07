<div class="page">
  <div class="glass">
    <h1>Bello!</h1>
    <p class="subtitle">Scan the QR to start the game.</p>
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
    margin-top: 1rem;
    font-size: 1.2rem;
  }
</style>
