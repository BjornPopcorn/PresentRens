<script>
  import { onMount } from "svelte";
  const { src } = $props();

  let audio;
  let bar;
  let fill;
  let playing = false;

  onMount(() => {
    const loop = () => {
      if (audio && fill && audio.duration > 0) {
        const pct = audio.currentTime / audio.duration;
        fill.style.transform = `scaleX(${pct})`;
      }
      requestAnimationFrame(loop);
    };
    loop();
  });

  function toggle() {
    if (!audio) return;
    playing ? audio.pause() : audio.play();
    playing = !playing;
  }

  function seek(e) {
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  }
</script>

<div class="player">
  <audio bind:this={audio} src={src}></audio>

  <div class="bar" bind:this={bar} on:click={seek}>
    <div class="fill" bind:this={fill}></div>
  </div>

  <button class="round" on:click={toggle}>
    {#if playing}
      <!-- Pause icon -->
      <div class="pause-icon">
        <div></div>
        <div></div>
      </div>
    {:else}
      <!-- Play icon -->
      <div class="play-icon"></div>
    {/if}
  </button>
</div>

<style>
  .player {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-items: center;
    width: 100%;
  }

  .bar {
    width: 100%;
    height: 10px;
    background: rgba(255,255,255,0.25);
    border-radius: 5px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: white;
    transform-origin: left;
    transform: scaleX(0);
  }

  /* Round play/pause button */
  .round {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .round:hover {
    transform: scale(1.05);
  }

  /* Play triangle */
  .play-icon {
    width: 0;
    height: 0;
    border-left: 22px solid black;
    border-top: 14px solid transparent;
    border-bottom: 14px solid transparent;
    margin-left: 4px;
  }

  /* Pause bars */
  .pause-icon {
    display: flex;
    gap: 8px;
  }

  .pause-icon div {
    width: 10px;
    height: 28px;
    background: black;
    border-radius: 3px;
  }
</style>
