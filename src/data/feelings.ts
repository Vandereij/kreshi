// src/data/feelings.ts

export type FeelingsByMood = {
	[key: string]: string[];
};

export const feelingsByMood: FeelingsByMood = {
	great: ["Ecstatic", "Joyful", "Grateful", "Excited", "Proud", "Motivated"],
	good: ["Happy", "Hopeful", "Pleased", "Content", "Relaxed", "Peaceful"],
	okay: ["Neutral", "Calm", "Indifferent", "Reflective", "Meh"],
	bad: ["Sad", "Stressed", "Irritated", "Worried", "Tired", "Lonely"],
	awful: [
		"Anxious",
		"Angry",
		"Overwhelmed",
		"Hopeless",
		"Miserable",
		"Depressed",
	],
};

// --- ADD THIS NEW ARRAY ---
export const allFeelings: string[] = [
	// Positive - High Energy
	"Excited",
	"Ecstatic",
	"Elated",
	"Enthusiastic",
	"Eager",
	"Motivated",
	// Positive - Low Energy
	"Happy",
	"Joyful",
	"Grateful",
	"Proud",
	"Content",
	"Pleased",
	"Relaxed",
	"Peaceful",
	"Hopeful",
	"Calm",
	// Neutral
	"Neutral",
	"Indifferent",
	"Reflective",
	"Meh",
	"Okay",
	// Negative - Low Energy
	"Sad",
	"Lonely",
	"Depressed",
	"Miserable",
	"Tired",
	"Bored",
	"Apathetic",
	// Negative - High Energy
	"Anxious",
	"Stressed",
	"Irritated",
	"Worried",
	"Angry",
	"Overwhelmed",
	"Frustrated",
	"Jealous",
	"Insecure",
	"Hopeless",
];
