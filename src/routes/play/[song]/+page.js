import { supabase } from '$lib/supabaseClient.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const { song } = params;
  console.log("PARAM SONG:", song);
  console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);
  console.log("SUPABASE KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY);


  const { data, err } = await supabase
    .from('songs')
    .select('*')
    .eq('id', song)
    .single();

  if (err || !data) {
    throw error(404, 'Song not found :(');
  }

  return { song: data };
}
