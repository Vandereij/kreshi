// src/data/moods.ts
import {
	IconMoodHappy,
	IconMoodSmile,
	IconMoodEmpty,
	IconMoodSad,
	IconMoodCry,
} from "@tabler/icons-react";

// Define a type for our mood objects for better TypeScript safety
export interface Mood {
	icon: React.ElementType;
	value: string;
	label: string;
	color: string;
}

export const moods: Mood[] = [
	{ icon: IconMoodHappy, value: "great", label: "Great", color: "#FFF4D4" },
	{ icon: IconMoodSmile, value: "good", label: "Good", color: "#FFE6C1" },
	{ icon: IconMoodEmpty, value: "okay", label: "Okay", color: "#F8D6B7" },
	{ icon: IconMoodSad, value: "bad", label: "Bad", color: "#F7C6B4" },
	{ icon: IconMoodCry, value: "awful", label: "Awful", color: "#E0EFFF" },
];
