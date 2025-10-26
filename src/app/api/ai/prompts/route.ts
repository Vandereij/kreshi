// src/app/api/ai/prompts/route.ts
import { NextResponse } from "next/server";

type ThemeScore = { theme: string; score: number };

// Increased to allow more themes while staying within token limits
const MAX_THEMES_IN_PROMPT = 30;
const TOP_THEMES_HIGHLIGHTED = 8; // Highlight more top themes

// New type for mood context
type MoodContext = {
	yesterdayMood?: string;
	yesterdayFeelings?: string[];
	weekTrend?: "improving" | "declining" | "stable" | "mixed";
	averageWeekMood?: number; // -2 to 2 scale
	mostRecurrentFeelings?: Array<{ feeling: string; count: number }>;
};

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as {
			themes?: string[];
			scoredThemes?: ThemeScore[];
			plan?: string | null;
			moodContext?: MoodContext;
		};

		let orderedThemes: string[] = [];
		const selectedPlan = body.plan;
		const moodContext = body.moodContext;

		if (Array.isArray(body.scoredThemes) && body.scoredThemes.length > 0) {
			const sorted = [...body.scoredThemes].sort(
				(a, b) => (b.score ?? 0) - (a.score ?? 0)
			);
			orderedThemes = sorted.map((t) => t.theme);
		} else if (Array.isArray(body.themes) && body.themes.length > 0) {
			orderedThemes = body.themes;
		}

		// Improved deduplication that preserves contextual phrases
		const seen = new Set<string>();
		const compactThemes = orderedThemes.filter((t) => {
			const key = t.trim().toLowerCase();
			if (!key || seen.has(key)) return false;

			// Check if this theme is a substring of an already selected theme
			// (e.g., skip "sister" if "my sister" already exists)
			for (const existing of seen) {
				if (existing.includes(key) && existing !== key) {
					return false; // Skip this as it's contained in a longer phrase
				}
				if (key.includes(existing) && existing !== key) {
					// This is a longer version, remove the shorter one
					seen.delete(existing);
					break;
				}
			}

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

		// Enhanced system prompt with better instructions
		const systemPrompt = `You are a supportive journaling assistant. Generate a personalized prompt based on the user's recent emotional patterns and journal themes.

**Important Instructions:**
* Do not give medical advice.
* Do not use stigmatizing language.
* Keep the tone gentle and non-judgmental.
* If the user expresses severe distress, gently suggest seeking professional help.
* Focus on self-reflection and empowerment.
* The sentence should be complete, don't return sentences that are interrupted.
* Max 50 words.

**Context Awareness:**
* Pay special attention to the highlighted (bold) themes as they are most significant.
* Notice contextual relationships in themes (e.g., "my sister" indicates a family relationship).
* Tailor the prompt based on their mood trend (improving, declining, stable, or mixed).
* If declining, offer gentle support and encourage small wins.
* If improving, acknowledge progress and encourage continued momentum.
* Reference their most common feelings when relevant.
* Consider yesterday's mood and feelings to create continuity.
* Weave multiple related themes together when possible.

**Provide an explanation of how the prompt will help**
**You must respond with only the raw text of the prompt, without any JSON formatting, quotes, or markdown.**`;

		// Build enhanced user prompt with better theme formatting
		let userPrompt = `Recent themes (most→least significant):\n`;

		// Group themes by importance
		const topTier = topThemes.slice(0, TOP_THEMES_HIGHLIGHTED);
		const secondTier = topThemes.slice(TOP_THEMES_HIGHLIGHTED);

		if (topTier.length > 0) {
			userPrompt += `**Top themes:** ${topTier.join(", ")}\n`;
		}

		if (secondTier.length > 0) {
			userPrompt += `**Other themes:** ${secondTier.join(", ")}\n`;
		}

		if (moodContext) {
			userPrompt += "\n**Mood Context:**";

			if (moodContext.yesterdayMood) {
				userPrompt += `\n- Yesterday's mood: ${moodContext.yesterdayMood}`;
			}

			if (
				moodContext.yesterdayFeelings &&
				moodContext.yesterdayFeelings.length > 0
			) {
				userPrompt += `\n- Yesterday's feelings: ${moodContext.yesterdayFeelings.join(
					", "
				)}`;
			}

			if (moodContext.weekTrend) {
				const trendDescriptions = {
					improving: "showing improvement over the past week",
					declining: "showing a decline over the past week",
					stable: "relatively stable over the past week",
					mixed: "fluctuating over the past week",
				};
				userPrompt += `\n- Week trend: ${
					trendDescriptions[moodContext.weekTrend]
				}`;
			}

			if (
				moodContext.mostRecurrentFeelings &&
				moodContext.mostRecurrentFeelings.length > 0
			) {
				const topFeelings = moodContext.mostRecurrentFeelings
					.slice(0, 5)
					.map((f) => `${f.feeling} (${f.count}x)`)
					.join(", ");
				userPrompt += `\n- Most recurrent feelings: ${topFeelings}`;
			}

			if (typeof moodContext.averageWeekMood === "number") {
				const moodLabel =
					moodContext.averageWeekMood >= 1
						? "positive"
						: moodContext.averageWeekMood <= -1
						? "negative"
						: "neutral";
				userPrompt += `\n- Average weekly mood: ${moodLabel} (${moodContext.averageWeekMood.toFixed(
					1
				)})`;
			}
		}

		let response;

		if (selectedPlan === "pro") {
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
