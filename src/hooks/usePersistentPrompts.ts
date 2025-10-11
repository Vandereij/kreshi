// src/hooks/usePersistentPrompts.ts
import { useState, useEffect, useCallback } from 'react';
import { extractThemes } from '@/lib/themeExtractor';

const PROMPTS_STORAGE_KEY = 'soullog_ai_prompts';
const REFRESH_COUNT_STORAGE_KEY = 'soullog_ai_refresh_count';
const LAST_VISIT_DATE_KEY = 'soullog_ai_last_visit_date';
const MAX_PROMPTS_PER_DAY = 3;

type JournalEntry = {
    content: string;
    date: string;
};

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

export const usePersistentPrompts = (entries: JournalEntry[]) => {
    const [prompts, setPrompts] = useState<string[]>([]);
    const [refreshCount, setRefreshCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Effect to handle daily clear/load on initial render
    useEffect(() => {
        const storedPrompts = localStorage.getItem(PROMPTS_STORAGE_KEY);
        const storedRefreshCount = localStorage.getItem(REFRESH_COUNT_STORAGE_KEY);
        const lastVisitDate = localStorage.getItem(LAST_VISIT_DATE_KEY);
        const today = getTodayDateString();

        if (lastVisitDate !== today) {
            // It's a new day or the first visit
            console.log("New day detected or first visit. Clearing prompts and reset count.");
            setPrompts([]);
            setRefreshCount(0);
            localStorage.removeItem(PROMPTS_STORAGE_KEY);
            localStorage.removeItem(REFRESH_COUNT_STORAGE_KEY);
            // Don't set LAST_VISIT_DATE_KEY here yet, it will be set after a prompt is generated
            // or implicitly by the generateNewPrompt if it's called immediately.
        } else {
            // Same day, load existing prompts and count
            if (storedPrompts) {
                setPrompts(JSON.parse(storedPrompts));
            }
            if (storedRefreshCount) {
                setRefreshCount(parseInt(storedRefreshCount, 10));
            }
            console.log("Same day visit. Loading existing prompts and count.");
        }
        
        // Always set the LAST_VISIT_DATE_KEY on component mount for the current day.
        // This ensures that even if no prompts are generated, the app still knows it was "visited" today.
        localStorage.setItem(LAST_VISIT_DATE_KEY, today); 
        setIsInitialized(true); 
    }, []);

    const canRefresh = refreshCount < MAX_PROMPTS_PER_DAY && !isLoading;

    const generateNewPrompt = useCallback(async (currentEntries: JournalEntry[]) => {
        if (!canRefresh) {
            console.log("Max prompts generated for the day or already loading.");
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

            let updatedPrompts = prompts;
            if (newPrompt && !prompts.includes(newPrompt)) {
                updatedPrompts = [...prompts, newPrompt];
            } else if (newPrompt) {
                console.log("Generated prompt already exists, incrementing count.");
            }
            
            const newRefreshCount = refreshCount + 1;

            setPrompts(updatedPrompts);
            setRefreshCount(newRefreshCount);

            localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(updatedPrompts));
            localStorage.setItem(REFRESH_COUNT_STORAGE_KEY, newRefreshCount.toString());
            
            // --- FIX: Ensure LAST_VISIT_DATE_KEY is set/updated on successful prompt generation ---
            // This ensures that if the user generates prompts, the date reflects activity.
            // It also reinforces the idea that an active session today has happened.
            const today = getTodayDateString();
            localStorage.setItem(LAST_VISIT_DATE_KEY, today); 

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [prompts, isLoading, refreshCount, canRefresh]);

    // Effect for automatic initial prompt generation if none exist for today and count allows
    useEffect(() => {
        if (isInitialized && entries.length > 0 && prompts.length === 0 && refreshCount === 0 && canRefresh) {
            console.log("Generating initial prompt for the day (first of three).");
            generateNewPrompt(entries);
        }
    }, [isInitialized, entries, prompts.length, refreshCount, canRefresh, generateNewPrompt]);


    const clearPrompts = useCallback(() => {
        setPrompts([]);
        setRefreshCount(0);
        localStorage.removeItem(PROMPTS_STORAGE_KEY);
        localStorage.removeItem(REFRESH_COUNT_STORAGE_KEY);
        // Do NOT remove LAST_VISIT_DATE_KEY here. It should persist for the current day.
        console.log("Stored prompts and refresh count have been manually cleared.");
    }, []);

    return { prompts, isLoading, error, generateNewPrompt, clearPrompts, canRefresh };
};