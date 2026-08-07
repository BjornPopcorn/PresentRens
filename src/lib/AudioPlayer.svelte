<script>
  import { onMount } from "svelte";

  // Runes-mode props
  const { src } = $props();

  let audio;
  let bar;
  let fill;
  let playing = false;

  onMount(() => {
    // DOM-only loop, safe in runes mode
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

  <button class="toggle" on:click={toggle}>
    {playing ? "Pause" : "Play"}
  </button>
</div>

<style>
  .player {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
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

  .toggle {
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    background: white;
    border: none;
    cursor: pointer;
  }
</style>
