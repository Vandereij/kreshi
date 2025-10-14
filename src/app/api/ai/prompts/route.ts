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

		const systemPrompt =
			"You are a supportive journaling assistant. Generate a prompt for a user feeling overwhelmed. **Important Instructions:** * Do not give medical advice. * Do not use stigmatizing language. * Keep the tone gentle and non-judgmental. * If the user expresses severe distress, gently suggest seeking professional help. * Focus on self-reflection and empowerment. * The sentence should be complete, don't return sentences that are interrupted * Max 50 words **Prompt Request:** Create a prompt that helps the user break down their overwhelming feelings into smaller, more manageable parts. **You must respond with only the raw text of the prompt, without any JSON formatting, quotes, or markdown.**";

		// const systemPrompt =
		// "You are a thoughtful journaling assistant. Based on the user's recurring themes, create exactly one insightful and gentle prompt to help them explore their feelings more deeply. The prompt must be a single, concise sentence, following CBT analysis and best practice. **You must respond with only the raw text of the prompt, without any JSON formatting, quotes, or markdown.**";

		// const systemPrompt =
		// 	"You are a thoughtful journaling assistant. Based on the user's recurring themes, create exactly one insightful and gentle prompt to help them explore their feelings from a unique and novel angle. The prompt must be a single, concise sentence. **You must respond with only the raw text of the prompt, without any JSON formatting, quotes, or markdown.**";
		const userPrompt = `Recent themes: ${themes.join(", ")}.`;

		if (!process.env.MISTRAL_API_KEY) {
			throw new Error("MISTRAL_API_KEY is not set.");
		}

		const response = await fetch(
			"https://api.mistral.ai/v1/chat/completions",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
				},
				cache: "no-store",
				body: JSON.stringify({
					model: "mistral-medium-latest",
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userPrompt },
					],
					temperature: 0.7,
					max_tokens: 150,
				}),
			}
		);

		// const response = await fetch("https://api.anthropic.com/v1/messages", {
		//   method: "POST",
		//   headers: {
		//     "Content-Type": "application/json",
		//     "x-api-key": process.env.CLAUDE_API_KEY,
		//     "anthropic-version": "2023-06-01"
		//   },
		//   body: JSON.stringify({
		//     model: "claude-3-5-haiku-latest",
		//     max_tokens: 150,
		//     temperature: 0.7,
		//     system: systemPrompt,
		//     messages: [
		//       { role: "user", content: userPrompt }
		//     ]
		//   })
		// });

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
			return NextResponse.json(
				{ error: `API request failed with status ${response.status}` },
				{ status: response.status }
			);
		}

		const data = await response.json();
		let prompt = data.choices[0]?.message?.content;

		if (!prompt) {
			return NextResponse.json({ prompt: "" });
		}

		prompt = prompt.trim().replace(/^"|"$/g, "");

		return NextResponse.json({ prompt });
	} catch (error) {
		console.error("Error in /api/ai/prompts:", error);
		return NextResponse.json(
			{ error: "An internal server error occurred." },
			{ status: 500 }
		);
	}
}
