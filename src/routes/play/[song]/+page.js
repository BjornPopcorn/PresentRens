import { supabase } from '$lib/supabaseClient.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const { song } = params;

  console.log("PARAM SONG:", song);

  const { data, err } = await supabase
    .from('songs')
    .select('*')
    .eq('id', song)
    .single();

  if (err || !data) {
    throw error(404, 'Something went wrong, the website may be inactive. Contact Bjorn to reactivate it');
  }

  return { song: data };
}
