// netlify/functions/generate-weekly-summaries.ts
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!; // keep in Netlify env
const DEFAULT_TZ = 'Europe/London';

// Thin wrapper so you can swap providers (OpenAI/Anthropic/Mistral)
async function generateWeeklySummaryLLM(input: {
  entries: { created_at: string; content: string }[];
  tz: string;
}) {
  const prompt = `
You are a supportive CBT journaling companion. Summarize the user's week (timezone: ${input.tz}):
- Identify recurring themes, emotions, and triggers
- Highlight coping skills used and small wins
- Offer 2-3 gentle, empowering reflections for the coming week
- Avoid medical advice or diagnoses
- Keep it ~180-250 words, cohesive and kind

Entries:
${input.entries.map(e => `- [${e.created_at}] ${e.content}`).join('\n')}
  `.trim();

  // Example with OpenAI (swap to your provider of choice)
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
			model: process.env.COHERE_MODEL ?? "command-r",
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`LLM error: ${await res.text()}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content?.trim() ?? '';
  return { summary: content, model: 'gpt-4o-mini' };
}

function weekRangeForUser(nowUtc: DateTime, tz: string) {
  // Find the most recently COMPLETED week Mon 00:00 to Sun 23:59:59 in user's tz
  const nowLocal = nowUtc.setZone(tz);
  // Go to start of this week (Mon), then subtract 1 week to get last week
  const startOfThisWeek = nowLocal.startOf('week').plus({ days: 1 }); // Luxon: week starts Sunday; shift to Monday
  const startOfLastWeek = startOfThisWeek.minus({ weeks: 1 });
  const endOfLastWeek = startOfLastWeek.plus({ weeks: 1 }).minus({ seconds: 1 });

  return {
    localStart: startOfLastWeek,
    localEnd: endOfLastWeek,
    utcStart: startOfLastWeek.toUTC(),
    utcEnd: endOfLastWeek.toUTC(),
  };
}

// Only run summaries when we're close to Sunday night / early Monday in user tz.
// This prevents duplicate work every hour while still being robust.
function isWithinRunWindow(nowUtc: DateTime, tz: string) {
  const local = nowUtc.setZone(tz);
  // Window: Sunday 20:00 → Monday 02:00 local time
  const day = local.weekday; // 1=Mon ... 7=Sun
  const hour = local.hour;
  return (day === 7 && hour >= 20) || (day === 1 && hour < 2);
}

export const handler: Handler = async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const nowUtc = DateTime.utc();
  const PAGE_SIZE = 500;
  let from = 0;
  let processed = 0;

  // Page through profiles (assumes a 'profiles' table with id + timezone)
  while (true) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, timezone')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!profiles?.length) break;

    for (const p of profiles) {
      const tz = p.timezone || DEFAULT_TZ;
      if (!isWithinRunWindow(nowUtc, tz)) continue;

      const { utcStart, utcEnd, localStart, localEnd } = weekRangeForUser(nowUtc, tz);

      // Check idempotency: skip if summary already exists
      const { data: existing, error: existingErr } = await supabase
        .from('weekly_summaries')
        .select('id')
        .eq('user_id', p.id)
        .eq('week_start', localStart.toUTC().toISO())
        .limit(1)
        .maybeSingle();
      if (existingErr) throw existingErr;
      if (existing) continue;

      // Fetch user entries for that week
      const { data: entries, error: entriesErr } = await supabase
        .from('journal_entries')
        .select('created_at, content')
        .eq('user_id', p.id)
        .gte('created_at', utcStart.toISO())
        .lte('created_at', utcEnd.toISO());

      if (entriesErr) throw entriesErr;
      if (!entries || entries.length === 0) continue; // nothing to summarize

      // Generate summary
      const { summary, model } = await generateWeeklySummaryLLM({
        entries,
        tz,
      });

      // UPSERT
      const { error: upsertErr } = await supabase.from('weekly_summaries').upsert({
        user_id: p.id,
        week_start: localStart.toUTC().toISO(),
        week_end: localEnd.toUTC().toISO(),
        timezone: tz,
        entry_count: entries.length,
        summary,
        model,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' });

      if (upsertErr) throw upsertErr;
      processed++;
    }

    from += PAGE_SIZE;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, processed }),
  };
};
