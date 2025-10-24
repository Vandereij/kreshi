export type CrisisCategory = "suicide" | "selfHarm" | "harmOthers";

export interface CrisisDetectionResult {
	hasCrisisContent: boolean;
	categories: CrisisCategory[];
	matchedKeywords?: string[];
}

export interface CrisisResources {
	suicide: {
		usNational: string;
		usText: string;
		international: string;
	};
	generic: string;
}

const CRISIS_KEYWORDS: Record<CrisisCategory, string[]> = {
	suicide: [
		"suicide",
		"suicidal",
		"kill myself",
		"killing myself",
		"end my life",
		"ending my life",
		"want to die",
		"better off dead",
		"no reason to live",
		"take my own life",
		"taking my own life",
		"don't want to live",
		"can't go on",
		"nothing to live for",
		"not worth living",
	],
	selfHarm: [
		"self harm",
		"self-harm",
		"cut myself",
		"cutting myself",
		"hurt myself",
		"hurting myself",
		"burn myself",
		"burning myself",
		"harm myself",
		"harming myself",
		"injure myself",
		"injuring myself",
		"self injury",
		"self-injury",
	],
	harmOthers: [
		"kill someone",
		"killing someone",
		"hurt someone",
		"hurting someone",
		"harm someone",
		"harming someone",
		"want to hurt",
		"going to hurt",
		"kill them",
		"murder",
		"violent thoughts about",
		"harm others",
		"hurt others",
	],
};

const CRISIS_RESOURCES: CrisisResources = {
	suicide: {
		usNational: "988", // 988 Suicide & Crisis Lifeline
		usText: "Text HOME to 741741", // Crisis Text Line
		international: "https://findahelpline.com",
	},
	generic:
		"If you're in crisis, please contact a mental health professional or crisis helpline immediately.",
};

/**
 * Detects crisis-related keywords in text content
 * @param content - String or array of strings to analyze
 * @param options - Configuration options
 * @returns Detection result with categories and matched keywords
 */
export function detectCrisisKeywords(
	content: string | string[],
	options: {
		includeMatchedKeywords?: boolean;
		customKeywords?: Partial<Record<CrisisCategory, string[]>>;
	} = {}
): CrisisDetectionResult {
	const { includeMatchedKeywords = false, customKeywords = {} } = options;

	// Merge custom keywords with defaults
	const keywordsToCheck: Record<CrisisCategory, string[]> = {
		suicide: [...CRISIS_KEYWORDS.suicide, ...(customKeywords.suicide || [])],
		selfHarm: [...CRISIS_KEYWORDS.selfHarm, ...(customKeywords.selfHarm || [])],
		harmOthers: [
			...CRISIS_KEYWORDS.harmOthers,
			...(customKeywords.harmOthers || []),
		],
	};

	// Normalize input to array and combine into single text
	const textArray = Array.isArray(content) ? content : [content];
	const normalizedText = textArray
		.map((t) => t.toLowerCase().trim())
		.join(" ");

	const foundCategories = new Set<CrisisCategory>();
	const matchedKeywords = includeMatchedKeywords ? new Set<string>() : null;

	// Check each category
	(Object.keys(keywordsToCheck) as CrisisCategory[]).forEach((category) => {
		const keywords = keywordsToCheck[category];

		for (const keyword of keywords) {
			if (normalizedText.includes(keyword)) {
				foundCategories.add(category);
				if (matchedKeywords) {
					matchedKeywords.add(keyword);
				}
				// Continue checking all keywords even after first match
			}
		}
	});

	return {
		hasCrisisContent: foundCategories.size > 0,
		categories: Array.from(foundCategories),
		...(includeMatchedKeywords && {
			matchedKeywords: Array.from(matchedKeywords || []),
		}),
	};
}

/**
 * Gets crisis resources based on detected categories
 * @param categories - Array of detected crisis categories
 * @returns Relevant crisis resources
 */
export function getCrisisResources(
	categories: CrisisCategory[]
): CrisisResources {
	// You can customize this to return different resources based on categories
	// For now, returning all resources
	return CRISIS_RESOURCES;
}

/**
 * Generates a crisis warning message based on detected categories
 * @param categories - Array of detected crisis categories
 * @returns Appropriate warning message
 */
export function getCrisisMessage(categories: CrisisCategory[]): string {
	if (categories.length === 0) {
		return "";
	}

	// You can customize messages based on specific categories
	if (categories.includes("suicide")) {
		return "We noticed your entry contains concerning themes related to self-harm or suicide. Your safety matters. Please consider reaching out for immediate support.";
	}

	if (categories.includes("harmOthers")) {
		return "We noticed your entry contains concerning themes about harming others. Please consider speaking with a mental health professional who can provide appropriate support.";
	}

	return "We noticed your entry contains concerning themes. Please consider reaching out to a mental health professional for support.";
}

/**
 * Complete crisis detection with message and resources
 * @param content - Content to analyze
 * @param options - Configuration options
 * @returns Complete crisis detection response
 */
export function analyzeCrisisContent(
	content: string | string[],
	options: {
		includeMatchedKeywords?: boolean;
		customKeywords?: Partial<Record<CrisisCategory, string[]>>;
	} = {}
) {
	const detection = detectCrisisKeywords(content, options);

	if (!detection.hasCrisisContent) {
		return {
			...detection,
			message: null,
			resources: null,
		};
	}

	return {
		...detection,
		message: getCrisisMessage(detection.categories),
		resources: getCrisisResources(detection.categories),
	};
}