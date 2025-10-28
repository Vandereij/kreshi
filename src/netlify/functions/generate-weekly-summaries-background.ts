// netlify/functions/generate-weekly-summaries.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { extractThemes } from "../../lib/themeExtractor";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEFAULT_TZ = "Europe/London";

function toError(e: unknown, hint?: string) {
	if (e instanceof Error) return e;
	try {
		return new Error(
			hint ? `${hint}: ${JSON.stringify(e)}` : JSON.stringify(e)
		);
	} catch {
		return new Error(hint ? `${hint}: ${String(e)}` : String(e));
	}
}

// —— LLM wrapper (now uses themes instead of raw content) ——
async function generateWeeklySummaryLLM(input: {
	themes: string[];
	entryCount: number;
	dateRange: { start: string; end: string };
	tz: string;
}) {
	const prompt = `
You are a supportive CBT journaling companion. Generate a weekly reflection based on the themes extracted from a user's journal entries (timezone: ${input.tz}).

Week: ${input.dateRange.start} to ${input.dateRange.end}
Number of entries: ${input.entryCount}

Key themes identified:
${input.themes.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Based on these themes:
- Identify patterns in emotions, experiences, and triggers
- Highlight any coping skills or positive developments
- Offer 2–3 gentle, empowering reflections for the coming week
- Avoid medical advice or diagnoses
- Keep it ~180–250 words, cohesive and kind

Note: These themes were extracted from the user's private journal entries to protect their privacy.
  `.trim();

	const res = await fetch("https://api.cohere.com/v2/chat", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: process.env.COHERE_MODEL ?? "command-r",
			messages: [{ role: "user", content: prompt }],
			temperature: 0.7,
		}),
	});

	interface CohereContentBlock {
		text?: string;
	}
	interface CohereChatResponse {
		message?: { content?: CohereContentBlock[] };
		choices?: { message?: { content?: CohereContentBlock[] } }[];
	}

	if (!res.ok) throw toError(await res.text(), "LLM error");

	const json = (await res.json()) as CohereChatResponse;

	const blocks: CohereContentBlock[] =
		json.message?.content ?? json.choices?.[0]?.message?.content ?? [];

	const text = blocks
		.filter((b): b is { text: string } => typeof b.text === "string")
		.map((b) => b.text)
		.join("")
		.trim();

	return { summary: text, model: process.env.COHERE_MODEL ?? "command-r" };
}

function weekRangeForUser(nowUtc: DateTime, tz: string) {
	const local = nowUtc.setZone(tz);
	const mondayThisWeek = local.startOf("week");
	const start = mondayThisWeek.minus({ weeks: 1 });
	const end = start.plus({ weeks: 1 }).minus({ seconds: 1 });
	return {
		localStart: start,
		localEnd: end,
		utcStart: start.toUTC(),
		utcEnd: end.toUTC(),
	};
}

function isWithinRunWindow(nowUtc: DateTime, tz: string) {
	const local = nowUtc.setZone(tz);
	const d = local.weekday; // 1=Mon…7=Sun
	const h = local.hour;
	return (d === 7 && h >= 20) || (d === 1 && h < 2);
}

export const handler: Handler = async (event) => {
	try {
		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
			auth: { persistSession: false },
		});

		const forceRun = event.queryStringParameters?.force === "true";

		const nowUtc = DateTime.utc();
		const PAGE_SIZE = 200;
		let from = 0;
		let processed = 0;
		let skipped = 0;
		let errors = 0;

		for (;;) {
			const { data: profiles, error } = await supabase
				.from("profiles")
				.select("id")
				.order("id", { ascending: true })
				.range(from, from + PAGE_SIZE - 1);

			if (error) throw toError(error, "profiles.select");
			if (!profiles?.length) break;

			for (const p of profiles) {
				try {
					const tz = (p as { id: string; timezone?: string }).timezone || DEFAULT_TZ;
					
					if (!forceRun && !isWithinRunWindow(nowUtc, tz)) {
						skipped++;
						continue;
					}

					const { utcStart, utcEnd, localStart, localEnd } =
						weekRangeForUser(nowUtc, tz);

					const weekStartIso = localStart.toUTC().toISO();

					console.log(`Processing user ${p.id}:`, {
						tz,
						weekStartIso,
						range: `${utcStart.toISO()} to ${utcEnd.toISO()}`
					});

					const { data: existing, error: existingErr } =
						await supabase
							.from("weekly_summaries")
							.select("id")
							.eq("user_id", p.id)
							.eq("week_start", weekStartIso)
							.maybeSingle();

					if (existingErr)
						throw toError(existingErr, "weekly_summaries.select");
					if (existing) {
						console.log(`Summary already exists for user ${p.id}`);
						skipped++;
						continue;
					}

					const { data: entries, error: entriesErr } = await supabase
						.from("journal_entries")
						.select("created_at, content")
						.eq("user_id", p.id)
						.gte("created_at", utcStart.toISO())
						.lte("created_at", utcEnd.toISO());

					if (entriesErr)
						throw toError(entriesErr, "journal_entries.select");
					
					if (!entries?.length) {
						console.log(`No entries found for user ${p.id} in range`);
						skipped++;
						continue;
					}

					console.log(`Found ${entries.length} entries for user ${p.id}`);

					// ✅ Extract themes instead of sending raw content
					const entriesWithDate = entries.map(e => ({
						text: e.content,
						date: new Date(e.created_at).toISOString().slice(0, 10)
					}));

					const themes = await extractThemes(
						entriesWithDate,
						7, // days to look back
						20, // max themes
						{ useEmbeddings: true, detailed: false }
					);

					if (!themes.length) {
						console.log(`No themes extracted for user ${p.id}`);
						skipped++;
						continue;
					}

					console.log(`Extracted ${themes.length} themes for user ${p.id}`);

					// ✅ Generate summary from themes only
					const { summary, model } = await generateWeeklySummaryLLM({
						themes,
						entryCount: entries.length,
						dateRange: {
							start: localStart.toFormat("yyyy-MM-dd"),
							end: localEnd.toFormat("yyyy-MM-dd")
						},
						tz,
					});

					const { error: upsertErr } = await supabase
						.from("weekly_summaries")
						.upsert(
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
							{ onConflict: "user_id,week_start" }
						);
					if (upsertErr)
						throw toError(upsertErr, "weekly_summaries.upsert");

					console.log(`Successfully created summary for user ${p.id}`);
					processed++;
				} catch (userErr) {
					errors++;
					console.error("Process user failed:", {
						userId: p.id,
						err: String(userErr),
					});
				}
			}

			from += PAGE_SIZE;
		}

		return {
			statusCode: 200,
			body: JSON.stringify({ 
				ok: true, 
				processed,
				skipped,
				errors,
				message: processed === 0 && skipped > 0 
					? "No users within run window. Use ?force=true to bypass time check."
					: undefined
			}),
			headers: { "content-type": "application/json" },
		};
	} catch (err) {
		const e = toError(err);
		console.error("generate-weekly-summaries failed:", e.message, e.stack);
		return {
			statusCode: 500,
			body: JSON.stringify({ ok: false, error: e.message }),
			headers: { "content-type": "application/json" },
		};
	}
};

export const config = { schedule: '0 0 * * 0' };