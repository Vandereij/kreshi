// src/app/api/ai/prompts/route.ts
import { NextResponse } from "next/server";

type ThemeScore = { theme: string; score: number };

type Plan = "free" | "plus" | "pro";

const MAX_THEMES_IN_PROMPT = 15;

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as {
			themes?: string[];
			scoredThemes?: ThemeScore[];
			plan?: string | null;
		};

		let orderedThemes: string[] = [];

		const selectedPlan = body.plan;

		if (Array.isArray(body.scoredThemes) && body.scoredThemes.length > 0) {
			const sorted = [...body.scoredThemes].sort(
				(a, b) => (b.score ?? 0) - (a.score ?? 0)
			);
			orderedThemes = sorted.map((t) => t.theme);
		} else if (Array.isArray(body.themes) && body.themes.length > 0) {
			orderedThemes = body.themes;
		}

		const seen = new Set<string>();
		const compactThemes = orderedThemes.filter((t) => {
			const key = t.trim().toLowerCase();
			if (!key || seen.has(key)) return false;
			seen.add(key);
			return true;
		});

		const topThemes = compactThemes.slice(0, MAX_THEMES_IN_PROMPT);

		if (topThemes.length === 0) {
			return NextResponse.json(
				{ error: "No themes provided." },
				{ status: 400 }
			);
		}

		const systemPrompt =
			"You are a supportive journaling assistant. Generate a prompt for a user feeling overwhelmed. **Important Instructions:** * Do not give medical advice. * Do not use stigmatizing language. * Keep the tone gentle and non-judgmental. * If the user expresses severe distress, gently suggest seeking professional help. * Focus on self-reflection and empowerment. * The sentence should be complete, don't return sentences that are interrupted * Max 50 words **Prompt Request:** Create a prompt that helps the user break down their overwhelming feelings into smaller, more manageable parts. **Provide an explanation of how the prompt will help **You must respond with only the raw text of the prompt, without any JSON formatting, quotes, or markdown.**";

		const userPrompt =
			`Recent themes (most→least significant): ` +
			topThemes
				.map((t, i) => (i < 5 ? `**${t}**` : t)) // subtly emphasize top 5
				.join(", ") +
			".";

		let response;

		if (selectedPlan === "pro") {
			// Check for Claude API key
			if (!process.env.CLAUDE_API_KEY) {
				throw new Error("CLAUDE_API_KEY is not set.");
			}

			response = await fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": process.env.CLAUDE_API_KEY,
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify({
					model: "claude-sonnet-4-5-20250929",
					max_tokens: 300,
					temperature: 0.7,
					system: systemPrompt,
					messages: [{ role: "user", content: userPrompt }],
				}),
			});
		} else {
			if (!process.env.COHERE_API_KEY) {
				throw new Error("COHERE_API_KEY is not set.");
			}

			response = await fetch("https://api.cohere.com/v2/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
				},
				cache: "no-store",
				body: JSON.stringify({
					model: process.env.COHERE_MODEL ?? "command-r",
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userPrompt },
					],
					temperature: 0.7,
					max_tokens: 150,
					// safety_mode: "CONTEXTUAL" | "STRICT" | "OFF"
				}),
			});
		}

		if (!response.ok) {
			const errorText = await response.text();
			console.error("API request failed:", errorText);
			return NextResponse.json(
				{
					error: `API request failed with status ${response.status}`,
				},
				{ status: response.status }
			);
		}

		const data = await response.json();

		// Handle Claude response format
		if (selectedPlan === "pro") {
			type Block = { type: string; text?: string };
			const blocks: Block[] = Array.isArray(data?.content)
				? (data.content as Block[])
				: [];

			const text = blocks
				.flatMap((b) =>
					b.type === "text" && typeof b.text === "string"
						? [b.text]
						: []
				)
				.join("\n");

			const prompt = text.trim().replace(/^"|"$/g, "");
			return NextResponse.json({ prompt });
		} else {
			// Handle Cohere response format
			type CohereBlock = { type: string; text?: string };
			const blocks: CohereBlock[] = Array.isArray(data?.message?.content)
				? (data.message.content as CohereBlock[])
				: [];

			const text = blocks
				.flatMap((b) =>
					b.type === "text" && typeof b.text === "string"
						? [b.text]
						: []
				)
				.join("\n");

			const prompt = text.trim().replace(/^"|"$/g, "");
			return NextResponse.json({ prompt });
		}
	} catch (error) {
		console.error("Error in /api/ai/prompts:", error);
		return NextResponse.json(
			{ error: "An internal server error occurred." },
			{ status: 500 }
		);
	}
}
