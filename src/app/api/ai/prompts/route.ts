// src/app/api/ai/prompts/route.ts
import { NextResponse } from "next/server";

const MODEL = "mistral-medium-latest";

// Helper to build the system prompt dynamically
function buildSystemPrompt(sentenceCount: number) {
	sentenceCount = 3;
	const sentenceWordGuidance =
		sentenceCount === 1
			? "exactly one complete sentence of 14–20 words"
			: `exactly ${sentenceCount} complete sentences, each 14–20 words long, all of them centered around the same theme`;

	return (
		`You are a supportive journaling assistant. Generate ${sentenceCount} gentle, reflective journaling ` +
		`prompt${
			sentenceCount > 1 ? "s" : ""
		} for a user feeling overwhelmed. ` +
		"Important: Do not give medical advice; avoid stigmatizing language; keep a gentle, non-judgmental tone; " +
		"If severe distress is expressed, gently suggest seeking professional help. " +
		`Your output MUST contain ${sentenceWordGuidance}, end each sentence with a period, and include no quotes, markdown, lists, emojis, or line breaks. ` +
		"Focus on self-reflection and empowerment. " +
		"Respond with only the raw prompt text."
	);
}

function countSentences(str: string) {
	return (str.match(/[.?!](\s|$)/g) || []).length;
}

function isWellFormedPrompt(str: string, expectedSentences: number) {
	const s = str.trim();
	if (!s || /\n/.test(s)) return false;
	const endsWithPeriod = /\.$/.test(s);
	const sentenceCount = countSentences(s);
	return endsWithPeriod && sentenceCount === expectedSentences;
}

async function callMistral(
	messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
	opts?: { temperature?: number; max_tokens?: number }
) {
	if (!process.env.MISTRAL_API_KEY) {
		throw new Error("MISTRAL_API_KEY is not set.");
	}

	const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
		},
		cache: "no-store",
		body: JSON.stringify({
			model: MODEL,
			messages,
			temperature: opts?.temperature ?? 0.4,
			max_tokens: opts?.max_tokens ?? 200, // generous limit for multi-sentence responses
		}),
	});

	if (!res.ok) {
		throw new Error(`Mistral API request failed with status ${res.status}`);
	}

	const data = await res.json();
	const content: string | undefined = data?.choices?.[0]?.message?.content;
	return (content ?? "").trim();
}

export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({}));
		const themes = (body?.themes as string[] | undefined) ?? [];
		const sentenceCount = Number(body?.sentenceCount) || 1; // default to 1 sentence

		if (!themes || themes.length === 0) {
			return NextResponse.json(
				{ error: "No themes provided." },
				{ status: 400 }
			);
		}

		const systemPrompt = buildSystemPrompt(sentenceCount);
		const userPrompt = `Recent themes: ${themes.join(", ")}.`;

		// Example few-shot to guide tone and brevity
		const fewShot: Array<{ role: "user" | "assistant"; content: string }> =
			[
				{
					role: "user",
					content: "Recent themes: anxiety, workload, time pressure.",
				},
				{
					role: "assistant",
					content:
						"What is one small step you can take today to ease pressure on your busiest task.",
				},
			];

		let prompt = await callMistral(
			[
				{ role: "system", content: systemPrompt },
				...fewShot,
				{ role: "user", content: userPrompt },
			],
			{ temperature: 0.4, max_tokens: 200 }
		);

		prompt = prompt.replace(/^"+|"+$/g, "").trim();

		// Verify that the number of sentences matches expectation
		const shapeIsGood = isWellFormedPrompt(prompt, sentenceCount);
		if (!shapeIsGood) {
			const repairInstruction = `Rewrite the following text into exactly ${sentenceCount} complete sentence${
				sentenceCount > 1 ? "s" : ""
			}, each ending with a period, no quotes or markdown, no extra content:`;

			const repaired = await callMistral(
				[
					{ role: "system", content: systemPrompt },
					{
						role: "user",
						content: `${repairInstruction}\n\n${prompt}`,
					},
				],
				{ temperature: 0.3, max_tokens: 150 }
			);

			const cleaned = repaired.replace(/^"+|"+$/g, "").trim();
			if (isWellFormedPrompt(cleaned, sentenceCount)) {
				prompt = cleaned;
			}
		}

		return NextResponse.json({ prompt });
	} catch (error) {
		console.error("Error in /api/ai/prompts:", error);
		return NextResponse.json(
			{ error: "An internal server error occurred." },
			{ status: 500 }
		);
	}
}
