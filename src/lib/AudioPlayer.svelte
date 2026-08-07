<script>
  import { onMount } from "svelte";

  const { src } = $props();

  let audio;
  let progress = 0;
  let duration = 0;
  let playing = false;

  onMount(() => {
    const loop = () => {
      if (audio) {
        progress = audio.currentTime;
        duration = audio.duration || 0;
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
    const rect = e.target.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }
</script>

<div class="player">
  <audio bind:this={audio} src={src}></audio>

  <div class="bar" on:click={seek}>
    <div class="fill" style="transform: scaleX({progress / duration});"></div>
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
  }

  .bar {
    width: 100%;
    height: 10px;
    background: rgba(255,255,255,0.25);
    border-radius: 5px;
    overflow: hidden;
    transform-origin: left;
  }

  .fill {
    height: 100%;
    background: white;
    transform-origin: left;
    transition: transform 0.05s linear;
  }

  .toggle {
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    background: white;
    border: none;
    cursor: pointer;
  }
</style>
