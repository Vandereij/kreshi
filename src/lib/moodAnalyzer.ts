// src/lib/moodAnalyzer.ts

type JournalEntry = {
	mood: string;
	feelings: string[];
	date: string; // ISO date string
};

type MoodContext = {
	yesterdayMood?: string;
	yesterdayFeelings?: string[];
	weekTrend?: "improving" | "declining" | "stable" | "mixed";
	averageWeekMood?: number;
	mostRecurrentFeelings?: Array<{ feeling: string; count: number }>;
};

// Map mood strings to numeric values for trend analysis
const moodToValue: Record<string, number> = {
	terrible: -2,
	bad: -1,
	okay: 0,
	good: 1,
	great: 2,
};

/**
 * Analyzes mood patterns from recent journal entries
 */
export function analyzeMoodContext(entries: JournalEntry[]): MoodContext {
	if (entries.length === 0) {
		return {};
	}

	// Sort entries by date (most recent first)
	const sortedEntries = [...entries].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
	);

	// Get yesterday's date (start of yesterday in local time)
	const now = new Date();
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	yesterday.setHours(0, 0, 0, 0);

	const endOfYesterday = new Date(yesterday);
	endOfYesterday.setHours(23, 59, 59, 999);

	// Find entry specifically from yesterday
	const yesterdayEntry = sortedEntries.find((entry) => {
		const entryDate = new Date(entry.date);
		return entryDate >= yesterday && entryDate <= endOfYesterday;
	});

	const yesterdayMood = yesterdayEntry?.mood;
	const yesterdayFeelings = yesterdayEntry?.feelings || [];

	// Get last 7 days of entries
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const weekEntries = sortedEntries.filter(
		(entry) => new Date(entry.date) >= sevenDaysAgo
	);

	// Calculate average mood for the week
	const moodValues = weekEntries
		.map((e) => moodToValue[e.mood] ?? 0)
		.filter((v) => !isNaN(v));

	const averageWeekMood =
		moodValues.length > 0
			? moodValues.reduce((sum, v) => sum + v, 0) / moodValues.length
			: 0;

	// Determine week trend
	const weekTrend = calculateWeekTrend(weekEntries);

	// Count feeling occurrences
	const feelingCounts = new Map<string, number>();
	weekEntries.forEach((entry) => {
		entry.feelings.forEach((feeling) => {
			feelingCounts.set(feeling, (feelingCounts.get(feeling) || 0) + 1);
		});
	});

	// Get most recurrent feelings
	const mostRecurrentFeelings = Array.from(feelingCounts.entries())
		.map(([feeling, count]) => ({ feeling, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	return {
		yesterdayMood,
		yesterdayFeelings,
		weekTrend,
		averageWeekMood,
		mostRecurrentFeelings,
	};
}

/**
 * Calculates the trend over the week by comparing first half to second half
 */
function calculateWeekTrend(
	entries: JournalEntry[]
): "improving" | "declining" | "stable" | "mixed" {
	if (entries.length < 2) {
		return "stable";
	}

	// Split into two halves
	const midpoint = Math.ceil(entries.length / 2);
	const recentHalf = entries.slice(0, midpoint);
	const earlierHalf = entries.slice(midpoint);

	const recentAvg = calculateAverageMood(recentHalf);
	const earlierAvg = calculateAverageMood(earlierHalf);

	// Check for high variance (mixed emotions)
	const variance = calculateMoodVariance(entries);
	if (variance > 1.5) {
		return "mixed";
	}

	const difference = recentAvg - earlierAvg;

	if (Math.abs(difference) < 0.3) {
		return "stable";
	} else if (difference > 0) {
		return "improving";
	} else {
		return "declining";
	}
}

function calculateAverageMood(entries: JournalEntry[]): number {
	if (entries.length === 0) return 0;

	const values = entries
		.map((e) => moodToValue[e.mood] ?? 0)
		.filter((v) => !isNaN(v));

	return values.length > 0
		? values.reduce((sum, v) => sum + v, 0) / values.length
		: 0;
}

function calculateMoodVariance(entries: JournalEntry[]): number {
	if (entries.length < 2) return 0;

	const values = entries
		.map((e) => moodToValue[e.mood] ?? 0)
		.filter((v) => !isNaN(v));

	if (values.length < 2) return 0;

	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
	const variance =
		squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

	return variance;
}
