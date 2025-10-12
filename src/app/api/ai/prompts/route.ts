// src/app/api/ai/prompts/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { themes } = (await req.json()) as { themes: string[] };

		if (!themes || themes.length === 0) {
			return NextResponse.json(
				{ error: "No themes provided." },
				{ status: 400 }
			);
		}

		// --- CHANGE: Ask for ONLY ONE prompt ---
		const systemPrompt =
			"You are a thoughtful journaling assistant. Based on the user's recurring themes, create exactly one insightful and gentle prompt to help them explore their feelings more deeply. The prompt must be a single, concise sentence, following CBT analysis and best practice. **You must respond with only the raw text of the prompt, without any JSON formatting, quotes, or markdown.**";
		const userPrompt = `Recent themes: ${themes.join(", ")}.`;

		if (!process.env.OPENAI_API_KEY || !process.env.CLAUDE_API_KEY) {
			throw new Error("API_KEY is not set.");
		}

		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": process.env.CLAUDE_API_KEY,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: "claude-sonnet-4-5",
				max_tokens: 150,
				temperature: 0.7,
				system: systemPrompt,
				messages: [{ role: "user", content: userPrompt }],
			}),
		});

		// const response = await fetch('https://api.openai.com/v1/chat/completions', {
		//   method: 'POST',
		//   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
		//   body: JSON.stringify({
		//     model: 'gpt-4o-mini',
		//     messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
		//     temperature: 0.7,
		//     max_tokens: 150,
		//   }),
		// });

		if (!response.ok) {
			const errorBody = await response.text();
			console.error("OpenAI API Error:", errorBody);
			return NextResponse.json(
				{ error: `API request failed with status ${response.status}` },
				{ status: response.status }
			);
		}

		const data = await response.json();
		let prompt = data.content?.[0]?.text ?? "";
		// let prompt = data.choices[0]?.message?.content;

		if (!prompt) {
			return NextResponse.json({ prompt: "" });
		}

		// --- CHANGE: Simpler cleanup for a single string ---
		// Remove any surrounding quotes that the AI might still add
		prompt = prompt.trim().replace(/^"|"$/g, "");

		// --- CHANGE: Return a single prompt object ---
		return NextResponse.json({ prompt });
	} catch (error) {
		console.error("Error in /api/ai/prompts:", error);
		return NextResponse.json(
			{ error: "An internal server error occurred." },
			{ status: 500 }
		);
	}
}
