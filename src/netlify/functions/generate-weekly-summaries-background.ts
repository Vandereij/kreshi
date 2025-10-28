// netlify/functions/generate-weekly-summaries.ts
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEFAULT_TZ = 'Europe/London';

function toError(e: unknown, hint?: string) {
  if (e instanceof Error) return e;
  try {
    return new Error(hint ? `${hint}: ${JSON.stringify(e)}` : JSON.stringify(e));
  } catch {
    return new Error(hint ? `${hint}: ${String(e)}` : String(e));
  }
}

// —— LLM wrapper ——
async function generateWeeklySummaryLLM(input: {
  entries: { created_at: string; content: string }[];
  tz: string;
}) {
  const prompt = `
You are a supportive CBT journaling companion. Summarize the user's week (timezone: ${input.tz}):
- Identify recurring themes, emotions, and triggers
- Highlight coping skills used and small wins
- Offer 2–3 gentle, empowering reflections for the coming week
- Avoid medical advice or diagnoses
- Keep it ~180–250 words, cohesive and kind

Entries:
${input.entries.map(e => `- [${e.created_at}] ${e.content}`).join('\n')}
  `.trim();

  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.COHERE_MODEL ?? 'command-r',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw toError(await res.text(), 'LLM error');
  const json: any = await res.json();

  // Cohere v2: json.message.content is an array of blocks; join text blocks
  const blocks = json?.message?.content ?? json?.choices?.[0]?.message?.content ?? [];
  const text = Array.isArray(blocks)
    ? blocks.map((b: any) => (typeof b?.text === 'string' ? b.text : '')).join('').trim()
    : (blocks?.toString?.() ?? '').trim();

  return { summary: text, model: process.env.COHERE_MODEL ?? 'command-r' };
}

function weekRangeForUser(nowUtc: DateTime, tz: string) {
  const local = nowUtc.setZone(tz);
  // Get last completed Mon–Sun week
  const mondayThisWeek = local.startOf('week').plus({ days: 1 }); // shift Sun→Mon
  const start = mondayThisWeek.minus({ weeks: 1 });
  const end = start.plus({ weeks: 1 }).minus({ seconds: 1 });
  return { localStart: start, localEnd: end, utcStart: start.toUTC(), utcEnd: end.toUTC() };
}

function isWithinRunWindow(nowUtc: DateTime, tz: string) {
  const local = nowUtc.setZone(tz);
  const d = local.weekday; // 1=Mon…7=Sun
  const h = local.hour;
  return (d === 7 && h >= 20) || (d === 1 && h < 2);
}

export const handler: Handler = async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    const nowUtc = DateTime.utc();
    const PAGE_SIZE = 200; // keep smaller to avoid timeouts
    let from = 0;
    let processed = 0;

    for (;;) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, timezone')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw toError(error, 'profiles.select');
      if (!profiles?.length) break;

      for (const p of profiles) {
        try {
          const tz = p.timezone || DEFAULT_TZ;
          if (!isWithinRunWindow(nowUtc, tz)) continue;

          const { utcStart, utcEnd, localStart, localEnd } = weekRangeForUser(nowUtc, tz);

          // idempotency: use a stable ISO date-only start in UTC
          const weekStartIso = localStart.toUTC().toISO();

          const { data: existing, error: existingErr } = await supabase
            .from('weekly_summaries')
            .select('id')
            .eq('user_id', p.id)
            .eq('week_start', weekStartIso)
            .maybeSingle();

          if (existingErr) throw toError(existingErr, 'weekly_summaries.select');
          if (existing) continue;

          const { data: entries, error: entriesErr } = await supabase
            .from('journal_entries')
            .select('created_at, content')
            .eq('user_id', p.id)
            .gte('created_at', utcStart.toISO())
            .lte('created_at', utcEnd.toISO());

          if (entriesErr) throw toError(entriesErr, 'journal_entries.select');
          if (!entries?.length) continue;

          const { summary, model } = await generateWeeklySummaryLLM({ entries, tz });

          const { error: upsertErr } = await supabase.from('weekly_summaries').upsert(
            {
              user_id: p.id,
              week_start: weekStartIso,
              week_end: localEnd.toUTC().toISO(),
              timezone: tz,
              entry_count: entries.length,
              summary,
              model,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,week_start' }
          );
          if (upsertErr) throw toError(upsertErr, 'weekly_summaries.upsert');

          processed++;
        } catch (userErr) {
          console.error('Process user failed:', { userId: p.id, err: String(userErr) });
          // Continue other users
        }
      }

      from += PAGE_SIZE;
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, processed }) };
  } catch (err) {
    const e = toError(err);
    console.error('generate-weekly-summaries failed:', e.message, e.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message }),
      headers: { 'content-type': 'application/json' },
    };
  }
};

// (Optional) If you want cron:
// export const config = { schedule: '0 0 * * 0' }; // Sundays 00:00
export const config = { schedule: "20 21 * * *" };
