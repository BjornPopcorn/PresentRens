<script>
  const { data } = $props();
  const { songId } = data;

  let audioElement;

  // Load the audio immediately when the component mounts
  $effect(() => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/songs/${songId}/full.mp4`;
    audioElement.src = url;
  });
</script>

<h1>Welcome! Press play below</h1>

<audio bind:this={audioElement} controls></audio>
