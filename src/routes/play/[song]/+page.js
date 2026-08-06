import { supabase } from '../../supabaseClient.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const { song } = params;

  const { data, err } = await supabase
    .from('songs')
    .select('*')
    .eq('id', song)
    .single();

  if (err || !data) {
    throw error(404, 'Song not found');
  }

  return { song: data };
}
