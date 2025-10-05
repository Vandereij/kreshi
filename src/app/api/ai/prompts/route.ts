// app/api/ai/prompts/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { themes } = await req.json() as { themes: string[] };

    if (!themes || themes.length === 0) {
      return NextResponse.json({ error: 'No themes provided.' }, { status: 400 });
    }

    const systemPrompt = "You are a thoughtful journaling assistant. Based on the user's recurring themes, create 3 insightful and gentle prompts to help them explore their feelings more deeply. Each prompt should be a single, concise sentence. **You must respond with only a raw JSON array of strings, without any markdown formatting or introductory text.**";
    const userPrompt = `Recent themes: ${themes.join(', ')}.`;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set.");
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('OpenAI API Error:', errorBody);
        return NextResponse.json({ error: `API request failed with status ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
        return NextResponse.json({ prompts: [] });
    }

    // --- START: ROBUST JSON PARSING ---
    try {
      // Find the start and end of the JSON array within the string
      const startIndex = content.indexOf('[');
      const endIndex = content.lastIndexOf(']');

      if (startIndex === -1 || endIndex === -1) {
        console.error("LLM response did not contain a valid JSON array:", content);
        // If no array is found, return empty to prevent frontend errors
        return NextResponse.json({ prompts: [] });
      }

      // Extract the JSON array substring
      const jsonString = content.substring(startIndex, endIndex + 1);
      
      // Now, parse the cleaned string
      const prompts = JSON.parse(jsonString);

      return NextResponse.json({ prompts });

    } catch (e) {
      console.error("Failed to parse JSON from LLM response. Raw content:", content, e);
      // If parsing fails even after cleaning, return empty
      return NextResponse.json({ prompts: [] });
    }
    // --- END: ROBUST JSON PARSING ---

  } catch (error) {
    console.error('Error in /api/ai/prompts:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}