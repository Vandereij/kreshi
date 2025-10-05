// hooks/useAiPrompts.ts
import { useState, useCallback } from 'react';
import { extractThemes } from '@/lib/themeExtractor';

type JournalEntry = {
  content: string;
  date: string;
};

export const useAiPrompts = () => {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePrompts = useCallback(async (entries: JournalEntry[], days: number = 14) => {
    setIsLoading(true);
    setError(null);

    const themes = extractThemes(
      entries.map(e => ({ text: e.content, date: e.date })),
      days
    );

    if (themes.length === 0) {
      setIsLoading(false);
      setPrompts([]);
      return;
    }

    try {
      const response = await fetch('/api/ai/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes }),
      });

      // --- Improved Error Handling ---
      if (!response.ok) {
        if (response.status === 429) {
          // This is the specific quota error
          console.error("AI service quota exceeded.");
          throw new Error('The AI assistant is temporarily unavailable due to high demand. Please try again later.');
        }
        // For other server errors
        throw new Error('Failed to fetch prompts from the server.');
      }
      // --- End of Improvement ---

      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setPrompts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { prompts, isLoading, error, generatePrompts };
};