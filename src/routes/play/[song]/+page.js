import { supabase } from '$lib/supabaseClient';

export async function load({ params }) {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return {
      status: 404,
      error: new Error('Song not found')
    };
  }

  return { song: data };
}
