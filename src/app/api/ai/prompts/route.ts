// src/app/api/ai/prompts/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { themes } = (await req.json()) as { themes: string[] };

    if (!themes || themes.length === 0) {
      return NextResponse.json({ error: "No themes provided." }, { status: 400 });
    }

    if (!process.env.COHERE_API_KEY) {
      throw new Error("COHERE_API_KEY is not set.");
    }

    const systemPrompt =
      "You are a supportive journaling assistant. Generate a prompt for a user feeling overwhelmed. **Important Instructions:** * Do not give medical advice. * Do not use stigmatizing language. * Keep the tone gentle and non-judgmental. * If the user expresses severe distress, gently suggest seeking professional help. * Focus on self-reflection and empowerment. * The sentence should be complete, don't return sentences that are interrupted * Max 50 words **Prompt Request:** Create a prompt that helps the user break down their overwhelming feelings into smaller, more manageable parts. **You must respond with only the raw text of the prompt, without any JSON formatting, quotes, or markdown.**";

    const userPrompt = `Recent themes: ${themes.join(", ")}.`;

    // Cohere v2 Chat API
    const response = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      },
      // `cache` is fine to omit; adding for parity with your original
      cache: "no-store",
      body: JSON.stringify({
        // You can pin a dated model like "command-r-08-2024" if you prefer stability.
        model: process.env.COHERE_MODEL ?? "command-r",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 150,
        // Optional: safety_mode: "CONTEXTUAL" | "STRICT" | "OFF"
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Cohere request failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Cohere v2 returns: { message: { role, content: [{ type: "text", text }, ...] }, ... }
    const blocks = data?.message?.content ?? [];
    const text = Array.isArray(blocks)
      ? blocks
          .filter((b: any) => b?.type === "text" && typeof b?.text === "string")
          .map((b: any) => b.text)
          .join("\n")
      : "";

    const prompt = (text || "").trim().replace(/^"|"$/g, "");

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("Error in /api/ai/prompts:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
