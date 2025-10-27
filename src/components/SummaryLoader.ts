// src/app/(app)/weekly/summary-loader.ts
import { createClientRSC } from '@/lib/supabase/server';
// import { DateTime } from 'luxon';

export async function loadWeeklySummary() {
  const supabase = await createClientRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { summary: null };

  // Get the most recent summary
  const { data, error } = await supabase
    .from('weekly_summaries')
    .select('*')
    .eq('user_id', user.id)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return { summary: data };
}
