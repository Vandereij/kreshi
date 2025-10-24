// src/hooks/usePersistentPrompts.ts
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { extractThemes, type ThemeScore } from "@/lib/themeExtractor";
import { SupabaseClient } from "@supabase/supabase-js";

const PROMPTS_STORAGE_KEY = "soullog_ai_prompts";
const REFRESH_COUNT_STORAGE_KEY = "soullog_ai_refresh_count";
const LAST_VISIT_DATE_KEY = "soullog_ai_last_visit_date";

const DAYS_LOOKBACK = 7;
const THEMES_TARGET = 30;

type JournalEntry = {
	content: string;
	date: string; // ISO string recommended
};

type Plan = "free" | "plus" | "pro";

type Options = {
	plan: Plan;
	userId?: string;
	supabase?: SupabaseClient;
	tableName?: string;
	enabled?: boolean;
};

const PLAN_LIMITS: Record<Plan, number> = {
	free: 2,
	plus: 5,
	pro: 15,
};

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const startOfTodayUTC = () => {
	const d = new Date();
	d.setUTCHours(0, 0, 0, 0);
	return d;
};
const endOfTodayUTC = () => {
	const d = new Date();
	d.setUTCHours(23, 59, 59, 999);
	return d;
};

const getRecentEntries = (all: JournalEntry[], days: number) => {
	const cutoff = new Date();
	cutoff.setHours(0, 0, 0, 0);
	cutoff.setDate(cutoff.getDate() - days);
	return all.filter((e) => {
		const d = new Date(e.date);
		return !Number.isNaN(d.getTime()) && d >= cutoff;
	});
};

export const usePersistentPrompts = (
	entries: JournalEntry[],
	opts: Options
) => {
	const {
		plan,
		userId,
		supabase,
		tableName = "user_prompts",
		enabled = false,
	} = opts;

	const [prompts, setPrompts] = useState<string[]>([]);
	const [usedCountToday, setUsedCountToday] = useState(0); // replaces refreshCount semantics
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	// 🆕 keep the latest scored themes (for UI/analytics)
	const [scoredThemes, setScoredThemes] = useState<ThemeScore[] | null>(null);

	// Prevent duplicate in-flight generation
	const generatingRef = useRef(false);

	const recentEntries = useMemo(
		() => getRecentEntries(entries, DAYS_LOOKBACK),
		[entries]
	);

	const DAILY_LIMIT = PLAN_LIMITS[plan];
	const prevPlanRef = useRef<Plan>(plan);

	const loadFromLocal = useCallback(() => {
		const storedPrompts = localStorage.getItem(PROMPTS_STORAGE_KEY);
		const storedCount = localStorage.getItem(REFRESH_COUNT_STORAGE_KEY);
		const lastVisitDate = localStorage.getItem(LAST_VISIT_DATE_KEY);
		const today = getTodayDateString();

		if (lastVisitDate !== today) {
			setPrompts([]);
			setUsedCountToday(0);
			localStorage.removeItem(PROMPTS_STORAGE_KEY);
			localStorage.removeItem(REFRESH_COUNT_STORAGE_KEY);
			setScoredThemes(null);
		} else {
			if (storedPrompts) setPrompts(JSON.parse(storedPrompts));
			if (storedCount) setUsedCountToday(parseInt(storedCount, 10));
		}

		localStorage.setItem(LAST_VISIT_DATE_KEY, today);
	}, []);

	const saveLocal = useCallback(
		(nextPrompts: string[], nextCount: number) => {
			localStorage.setItem(
				PROMPTS_STORAGE_KEY,
				JSON.stringify(nextPrompts)
			);
			localStorage.setItem(REFRESH_COUNT_STORAGE_KEY, String(nextCount));
			localStorage.setItem(LAST_VISIT_DATE_KEY, getTodayDateString());
		},
		[]
	);

	const loadFromDB = useCallback(async () => {
		if (!supabase || !userId) {
			setError("Supabase client and userId are required for paid plans.");
			return;
		}
		const from = startOfTodayUTC().toISOString();
		const to = endOfTodayUTC().toISOString();

		const { data, error: dbErr } = await supabase
			.from(tableName)
			.select("prompt, created_at")
			.eq("user_id", userId)
			.gte("created_at", from)
			.lte("created_at", to)
			.order("created_at", { ascending: true });

		if (dbErr) {
			setError(dbErr.message || "Failed to load prompts from database.");
			return;
		}

		const todaysPrompts = (data ?? []).map(
			(r: { prompt: string }) => r.prompt
		);
		setPrompts(todaysPrompts);
		setUsedCountToday(todaysPrompts.length);
	}, [supabase, userId, tableName]);

	// Init
	useEffect(() => {
		if (!enabled) return;

		const init = async () => {
			if (plan === "free") {
				loadFromLocal();
			} else {
				await loadFromDB();
			}
			setIsInitialized(true);
		};
		init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [plan, enabled, loadFromLocal, loadFromDB]);

	// --- If plan switches from free -> paid, migrate today's local prompts to DB (optional but helpful) ---
	useEffect(() => {
		if (!enabled) return;

		const prev = prevPlanRef.current;
		if (prev === "free" && (plan === "plus" || plan === "pro")) {
			(async () => {
				try {
					// read any local prompts for today
					const raw = localStorage.getItem(PROMPTS_STORAGE_KEY);
					const localPrompts: string[] = raw ? JSON.parse(raw) : [];
					if (localPrompts.length && supabase && userId) {
						// bulk insert unique prompts not already in DB today
						const from = startOfTodayUTC().toISOString();
						const to = endOfTodayUTC().toISOString();
						const { data: todays, error: readErr } = await supabase
							.from(tableName)
							.select("prompt")
							.eq("user_id", userId)
							.gte("created_at", from)
							.lte("created_at", to);

						if (readErr) throw readErr;
						const already = new Set(
							(todays ?? []).map((r: any) => r.prompt)
						);
						const toInsert = localPrompts
							.filter((p) => !already.has(p))
							.map((p) => ({
								user_id: userId,
								prompt: p,
							}));
						if (toInsert.length) {
							const { error: insErr } = await supabase
								.from(tableName)
								.insert(toInsert);
							if (insErr) throw insErr;
						}
					}
				} catch (e) {
					// Non-fatal: keep running even if migration fails
					console.warn("Prompt migration failed:", e);
				} finally {
					// Clear local store for cleanliness
					localStorage.removeItem(PROMPTS_STORAGE_KEY);
					localStorage.removeItem(REFRESH_COUNT_STORAGE_KEY);
					localStorage.removeItem(LAST_VISIT_DATE_KEY);
					// Reload from DB as source of truth
					if (supabase && userId) await loadFromDB();
				}
			})();
		}
		prevPlanRef.current = plan;
	}, [plan, enabled, supabase, userId, loadFromDB]);

	const canRefresh = enabled && usedCountToday < DAILY_LIMIT;

	const persistPrompt = useCallback(
		async (newPrompt: string) => {
			if (plan === "free") {
				// Local-only
				setPrompts((prev) => {
					const exists = prev.includes(newPrompt);
					const updated = exists ? prev : [...prev, newPrompt];
					const nextCount = exists
						? usedCountToday
						: usedCountToday + 1;
					setUsedCountToday(nextCount);
					saveLocal(updated, nextCount);
					return updated;
				});
				return;
			}

			// Plus / Pro: insert into DB
			if (!supabase || !userId) {
				throw new Error(
					"Supabase client and userId are required for paid plans."
				);
			}

			// Avoid duplicate insert if prompt already exists today
			if (prompts.includes(newPrompt)) {
				return;
			}

			const { error: dbErr } = await supabase.from(tableName).insert({
				user_id: userId,
				prompt: newPrompt,
				// created_at will default to now() in DB if column has default
			});

			if (dbErr) {
				throw new Error(
					dbErr.message || "Failed to save prompt to database."
				);
			}

			setPrompts((prev) => [...prev, newPrompt]);
			setUsedCountToday((c) => c + 1);
		},
		[plan, supabase, userId, tableName, prompts, saveLocal, usedCountToday]
	);

	const generateNewPrompt = useCallback(
		async (sourceEntries: JournalEntry[]) => {
			if (!enabled || !canRefresh || isLoading || generatingRef.current)
				return;

			generatingRef.current = true;
			setIsLoading(true);
			setError(null);

			const recent = getRecentEntries(sourceEntries, DAYS_LOOKBACK);
			if (recent.length === 0) {
				setError(
					"Not enough recent content (last 7 days) to generate a prompt."
				);
				setIsLoading(false);
				generatingRef.current = false;
				return;
			}

			try {
				// 🧠 Get scored themes (array of { theme, score })
				const detailed = await extractThemes(
					recent.map((e) => ({ text: e.content, date: e.date })),
					DAYS_LOOKBACK,
					THEMES_TARGET,
					{ detailed: true, useEmbeddings: true }
				);
				const themes = detailed.map((t) => t.theme);

				if (!themes.length) {
					setError(
						"Not enough recent content (last 7 days) to generate a prompt."
					);
					return;
				}

				setScoredThemes(detailed);

				const response = await fetch("/api/ai/prompts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ themes, scoredThemes: detailed }),
				});

				if (!response.ok)
					throw new Error("Failed to fetch a new prompt.");

				const data = await response.json();
				const newPrompt: string | undefined = data.prompt;

				if (newPrompt) {
					await persistPrompt(newPrompt);
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "An unknown error occurred."
				);
			} finally {
				setIsLoading(false);
				generatingRef.current = false;
			}
		},
		[enabled, canRefresh, isLoading, persistPrompt]
	);

	useEffect(() => {
		if (
			enabled &&
			isInitialized &&
			recentEntries.length > 0 &&
			prompts.length === 0 &&
			usedCountToday === 0 &&
			canRefresh
		) {
			generateNewPrompt(entries);
		}
	}, [
		enabled,
		isInitialized,
		entries,
		recentEntries.length,
		prompts.length,
		usedCountToday,
		canRefresh,
		generateNewPrompt,
	]);

	const clearPrompts = useCallback(async () => {
		if (!enabled) return;

		setPrompts([]);
		setUsedCountToday(0);
		setScoredThemes(null);

		if (plan === "free") {
			localStorage.removeItem(PROMPTS_STORAGE_KEY);
			localStorage.removeItem(REFRESH_COUNT_STORAGE_KEY);
			return;
		}
	}, [plan]);

	return {
		prompts,
		scoredThemes,
		isLoading,
		error,
		generateNewPrompt,
		clearPrompts,
		canRefresh,
		usedCountToday,
		dailyLimit: DAILY_LIMIT,
		plan,
	};
};
