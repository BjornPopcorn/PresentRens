import { supabase } from '$lib/supabaseClient';

export async function load({ params }) {
  const songId = params.song;

  const filePath = `${songId}/metadata.json`;

  const { data: file, error } = await supabase
    .storage
    .from('songs')
    .download(filePath);

  if (error) {
    console.error("Supabase storage error:", error);
    return { songId, metadata: null };
  }

  const text = await file.text();
  const metadata = JSON.parse(text);

  return { songId, metadata };
}
