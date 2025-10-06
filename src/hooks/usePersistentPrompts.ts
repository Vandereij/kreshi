// src/hooks/usePersistentPrompts.ts
import { useState, useEffect, useCallback } from 'react';
import { extractThemes } from '@/lib/themeExtractor';

const PROMPTS_STORAGE_KEY = 'soullog_ai_prompts';
const COUNT_STORAGE_KEY = 'soullog_ai_refresh_count';
const MAX_PROMPTS = 3;

type JournalEntry = {
    content: string;
    date: string;
};

export const usePersistentPrompts = (entries: JournalEntry[]) => {
    const [prompts, setPrompts] = useState<string[]>([]);
    const [refreshCount, setRefreshCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load stored prompts from localStorage on initial render
    useEffect(() => {
        const storedPrompts = localStorage.getItem(PROMPTS_STORAGE_KEY);
        const storedCount = localStorage.getItem(COUNT_STORAGE_KEY);
        if (storedPrompts) {
            setPrompts(JSON.parse(storedPrompts));
        }
        if (storedCount) {
            setRefreshCount(parseInt(storedCount, 10));
        }
    }, []);

    const canRefresh = prompts.length < MAX_PROMPTS && !isLoading;

    const generateNewPrompt = useCallback(async (currentEntries: JournalEntry[]) => {
        if (prompts.length >= MAX_PROMPTS) {
            console.log("Max prompts reached.");
            return;
        }
        if (isLoading) return;

        setIsLoading(true);
        setError(null);
        
        const themes = extractThemes(currentEntries.map(e => ({ text: e.content, date: e.date })), 14);

        if (themes.length === 0) {
            setError("Not enough recent content to generate a prompt.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/ai/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ themes }),
            });

            if (!response.ok) throw new Error('Failed to fetch a new prompt.');
            
            const data = await response.json();
            const newPrompt = data.prompt;

            if (newPrompt && !prompts.includes(newPrompt)) {
                const updatedPrompts = [...prompts, newPrompt];
                const updatedCount = updatedPrompts.length; // Sync count with length
                
                setPrompts(updatedPrompts);
                setRefreshCount(updatedCount);

                localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(updatedPrompts));
                localStorage.setItem(COUNT_STORAGE_KEY, updatedCount.toString());
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [prompts, isLoading]);

    // --- CHANGE: New effect for automatic initial prompt generation ---
    useEffect(() => {
        // Check if entries have been loaded, but we have no prompts yet,
        // and we haven't started any refresh cycle.
        if (entries.length > 0 && prompts.length === 0 && refreshCount === 0) {
            generateNewPrompt(entries);
        }
    }, [entries, prompts.length, refreshCount, generateNewPrompt]);

    const clearPrompts = useCallback(() => {
        setPrompts([]);
        setRefreshCount(0);
        localStorage.removeItem(PROMPTS_STORAGE_KEY);
        localStorage.removeItem(COUNT_STORAGE_KEY);
        console.log("Stored prompts have been cleared.");
    }, []);

    return { prompts, isLoading, error, generateNewPrompt, clearPrompts, canRefresh };
};