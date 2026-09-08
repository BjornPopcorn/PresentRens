import { supabase } from '$lib/supabaseClient.js';

export async function load() {
  const { data, error } = await supabase
    .from("songs")
    .select("year");

  if (error) {
    console.error("Error fetching years:", error);
    return { years: [] };
  }

  const counts = {};
  for (const row of data) {
    if (!row.year) continue;
    counts[row.year] = (counts[row.year] || 0) + 1;
  }

  const years = Object.entries(counts)
    .map(([year, count]) => ({ year: Number(year), count }))
    .sort((a, b) => a.year - b.year);

  return { years };
}
