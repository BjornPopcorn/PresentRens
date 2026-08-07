<script>
  import { onMount } from "svelte";

  const { src } = $props();   // ✔ runes‑mode compatible

  let audio;
  let progress = 0;
  let duration = 0;

  onMount(() => {
    const update = () => {
      if (audio) {
        progress = audio.currentTime;
        duration = audio.duration || 0;
      }
      requestAnimationFrame(update);
    };
    update();
  });

  function seek(e) {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * duration;
  }
</script>

<div class="player">
  <audio bind:this={audio} src={src}></audio>

  <div class="bar" on:click={seek}>
    <div class="fill" style="width: {(progress / duration) * 100}%"></div>
  </div>

  <button on:click={() => audio.play()}>Play</button>
  <button on:click={() => audio.pause()}>Pause</button>
</div>

<style>
  .bar {
    height: 8px;
    background: #444;
    border-radius: 4px;
    cursor: pointer;
    margin: 1rem 0;
  }
  .fill {
    height: 100%;
    background: #fff;
    border-radius: 4px;
  }
</style>
