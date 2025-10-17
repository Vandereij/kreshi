// src/hooks/usePersistentPrompts.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { extractThemes, type ThemeScore } from "@/lib/themeExtractor"; // ⬅️ scored themes

const PROMPTS_STORAGE_KEY = "soullog_ai_prompts";
const REFRESH_COUNT_STORAGE_KEY = "soullog_ai_refresh_count";
const LAST_VISIT_DATE_KEY = "soullog_ai_last_visit_date";

const MAX_PROMPTS_PER_DAY = 3;
const DAYS_LOOKBACK = 7;
const THEMES_TARGET = 30;

type JournalEntry = {
  content: string;
  date: string; // ISO string recommended
};

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const getRecentEntries = (all: JournalEntry[], days: number) => {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  return all.filter((e) => {
    const d = new Date(e.date);
    return !Number.isNaN(d.getTime()) && d >= cutoff;
  });
};

export const usePersistentPrompts = (entries: JournalEntry[]) => {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 🆕 keep the latest scored themes (for UI/analytics)
  const [scoredThemes, setScoredThemes] = useState<ThemeScore[] | null>(null);

  const recentEntries = useMemo(
    () => getRecentEntries(entries, DAYS_LOOKBACK),
    [entries]
  );

  useEffect(() => {
    const storedPrompts = localStorage.getItem(PROMPTS_STORAGE_KEY);
    const storedRefreshCount = localStorage.getItem(REFRESH_COUNT_STORAGE_KEY);
    const lastVisitDate = localStorage.getItem(LAST_VISIT_DATE_KEY);
    const today = getTodayDateString();

    if (lastVisitDate !== today) {
      setPrompts([]);
      setRefreshCount(0);
      localStorage.removeItem(PROMPTS_STORAGE_KEY);
      localStorage.removeItem(REFRESH_COUNT_STORAGE_KEY);
      setScoredThemes(null);
    } else {
      if (storedPrompts) setPrompts(JSON.parse(storedPrompts));
      if (storedRefreshCount) setRefreshCount(parseInt(storedRefreshCount, 10));
    }

    localStorage.setItem(LAST_VISIT_DATE_KEY, today);
    setIsInitialized(true);
  }, []);

  const canRefresh = refreshCount < MAX_PROMPTS_PER_DAY && !isLoading;

  const generateNewPrompt = useCallback(
    async (sourceEntries: JournalEntry[]) => {
      if (!canRefresh || isLoading) return;

      setIsLoading(true);
      setError(null);

      const recent = getRecentEntries(sourceEntries, DAYS_LOOKBACK);
      if (recent.length === 0) {
        setError("Not enough recent content (last 7 days) to generate a prompt.");
        setIsLoading(false);
        return;
      }

      try {
        // 🧠 Get scored themes (array of { theme, score })
        const detailed = await extractThemes(
          recent.map((e) => ({ text: e.content, date: e.date })),
          DAYS_LOOKBACK,
          THEMES_TARGET,
          { detailed: true, useEmbeddings: true } // embeddings + scores
        );
        const themes = detailed.map((t) => t.theme);

        if (!themes.length) {
          setError("Not enough recent content (last 7 days) to generate a prompt.");
          setIsLoading(false);
          return;
        }

        // store locally for UI
        setScoredThemes(detailed);

        const response = await fetch("/api/ai/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Keep your existing API happy; include scores as an optional extra
          body: JSON.stringify({ themes, scoredThemes: detailed }),
        });

        if (!response.ok) throw new Error("Failed to fetch a new prompt.");

        const data = await response.json();
        const newPrompt: string | undefined = data.prompt;

        if (newPrompt) {
          setPrompts((prev) => {
            const exists = prev.includes(newPrompt);
            const updated = exists ? prev : [...prev, newPrompt];
            localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });

          setRefreshCount((prev) => {
            const next = prev + 1;
            localStorage.setItem(REFRESH_COUNT_STORAGE_KEY, next.toString());
            return next;
          });

          localStorage.setItem(LAST_VISIT_DATE_KEY, getTodayDateString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    },
    [canRefresh, isLoading]
  );

  useEffect(() => {
    if (
      isInitialized &&
      recentEntries.length > 0 &&
      prompts.length === 0 &&
      refreshCount === 0 &&
      canRefresh
    ) {
      generateNewPrompt(entries);
    }
  }, [
    isInitialized,
    entries,
    recentEntries.length,
    prompts.length,
    refreshCount,
    canRefresh,
    generateNewPrompt,
  ]);

  const clearPrompts = useCallback(() => {
    setPrompts([]);
    setRefreshCount(0);
    setScoredThemes(null);
    localStorage.removeItem(PROMPTS_STORAGE_KEY);
    localStorage.removeItem(REFRESH_COUNT_STORAGE_KEY);
  }, []);

  return {
    prompts,
    scoredThemes, // 🆕 expose scored themes
    isLoading,
    error,
    generateNewPrompt,
    clearPrompts,
    canRefresh,
  };
};
