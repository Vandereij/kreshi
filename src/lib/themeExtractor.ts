// lib/themeExtractor.ts
import nlp from "compromise";

// -----------------------------
// Types
// -----------------------------
export type ThemeCategory = 'person' | 'place' | 'emotion' | 'activity' | 'cognition' | 'general';
export type DistortionType = 'allOrNothing' | 'shouldStatements' | 'catastrophizing' | 'labeling' | 'personalizing' | 'fortuneTelling';
export type Sentiment = 'positive' | 'negative' | 'neutral';

export type ThemeScore = { 
	theme: string; 
	score: number;
	category?: ThemeCategory;
	distortionType?: DistortionType;
	hasNegation?: boolean;
	sentiment?: Sentiment;
	frequency?: number;
	recency?: number;
};

export type EntryWithDate = {
	text: string;
	date: string; // 'YYYY-MM-DD'
};

type ExtractOpts = {
	useEmbeddings?: boolean; // default true
	mmrLambda?: number; // default 0.7
	decayTauDays?: number; // default 3
	maxSentencesForEmbed?: number; // default 800
	detailed?: boolean; // default false (return string[])
	includeCbtMetadata?: boolean; // default false
	maxTokens?: number; // default 10000 - limit text processing
};

interface CompromiseView {
	text(): string;
	has(tag: string): boolean;
	match(pattern: string): CompromiseView;
	forEach(callback: (match: CompromiseView) => void): void;
}

// -----------------------------
// Cached compiled regexes
// -----------------------------
const REGEX_CACHE = {
	emotion: /(feel|felt|feeling|emotion|anxious|anxiety|sad|sadness|happy|happiness|angry|anger|worried|worry|stressed|stress|depressed|depression|fear|afraid|scared|nervous|upset|frustrated|frustration|overwhelmed|lonely|loneliness|guilty|guilt|ashamed|shame|proud|pride|excited|excitement|hopeful|hopeless|helpless)/,
	cognition: /(always|never|should|must|can't|couldn't|won't|wouldn't|don't|terrible|awful|disaster|worst|everyone|no one|everything|nothing)/,
	activity: /(work|working|meeting|meetings|talk|talking|conversation|project|presentation|email|call|deadline|task|job)/,
	allOrNothing: /(always|never|every|everyone|no one|everything|nothing|all|none)/,
	shouldStatements: /(should|must|have to|ought to|need to|supposed to)/,
	catastrophizing: /(terrible|awful|disaster|catastrophe|worst|horrible|dreadful|nightmare)/,
	labeling: /(stupid|idiot|failure|loser|worthless|useless|incompetent|inadequate)/,
	personalizing: /(my fault|because of me|i caused|i'm responsible|i ruined|i messed up)/,
	fortuneTelling: /(will never|going to fail|won't work|will hate|going to be|will always)/,
	positiveWords: /(happy|joy|great|good|love|wonderful|excited|proud|grateful|thankful|amazing|excellent|fantastic|beautiful|peaceful|calm|confident|hopeful|blessed|lucky)/,
	negativeWords: /(sad|depressed|anxious|angry|hate|terrible|awful|bad|worst|never|can't|won't|fear|worried|stressed|overwhelmed|lonely|guilty|ashamed|helpless|hopeless|useless|failure|stupid)/,
	negation: /(not|no|never|nothing|nobody|nowhere|don't|doesn't|didn't|won't|wouldn't|can't|couldn't|shouldn't|wasn't|weren't|isn't|aren't|hasn't|haven't|hadn't|n't)/,
	cleanNonAlphaNum: /[^a-z0-9 ']/g,
	onlyDigits: /^\d+$/,
};

// -----------------------------
// Helpers
// -----------------------------

/** dependency-free n-grams with generator for memory efficiency */
function* generateNgramsIterator(tokens: string[], n: number): Generator<string[]> {
	if (n > tokens.length || n < 1) return;
	for (let i = 0; i <= tokens.length - n; i++) {
		yield tokens.slice(i, i + n);
	}
}

// ✅ Typed embedder (MiniLM) via @xenova/transformers (loaded lazily)
type FeatureExtractor = (
	inputs: string | string[],
	options?: { pooling?: "mean" | "none"; normalize?: boolean }
) => Promise<{ data: number[][] }>;

let embedderPromise: Promise<FeatureExtractor> | null = null;
async function getEmbedder(): Promise<FeatureExtractor> {
	if (!embedderPromise) {
		const { pipeline } = await import("@xenova/transformers");
		embedderPromise = pipeline(
			"feature-extraction",
			"Xenova/all-MiniLM-L6-v2"
		) as Promise<FeatureExtractor>;
	}
	return embedderPromise;
}

// Small vector helpers
function cosine(a: Float32Array, b: Float32Array) {
	let dot = 0, na = 0, nb = 0;
	const len = a.length;
	for (let i = 0; i < len; i++) {
		const av = a[i], bv = b[i];
		dot += av * bv;
		na += av * av;
		nb += bv * bv;
	}
	return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

function avgVectors(vecs: Float32Array[]) {
	const out = new Float32Array(vecs[0].length);
	const count = vecs.length;
	for (const v of vecs) {
		const len = v.length;
		for (let i = 0; i < len; i++) out[i] += v[i];
	}
	for (let i = 0; i < out.length; i++) out[i] /= count;
	return out;
}

function normalize(v: Float32Array) {
	let n = 0;
	const len = v.length;
	for (let i = 0; i < len; i++) n += v[i] * v[i];
	n = Math.sqrt(n) || 1;
	const out = new Float32Array(len);
	for (let i = 0; i < len; i++) out[i] = v[i] / n;
	return out;
}

function jaccard(a: Set<number>, b: Set<number>) {
	let inter = 0;
	for (const x of a) if (b.has(x)) inter++;
	const union = a.size + b.size - inter;
	return union === 0 ? 0 : inter / union;
}

// CBT-specific helpers (optimized with cached regexes)
function categorizeTheme(theme: string): ThemeCategory {
	const lower = theme.toLowerCase();
	
	if (REGEX_CACHE.emotion.test(lower)) return 'emotion';
	if (REGEX_CACHE.cognition.test(lower)) return 'cognition';
	if (REGEX_CACHE.activity.test(lower)) return 'activity';
	
	return 'general';
}

function detectDistortion(theme: string): DistortionType | undefined {
	const lower = theme.toLowerCase();
	
	if (REGEX_CACHE.allOrNothing.test(lower)) return 'allOrNothing';
	if (REGEX_CACHE.shouldStatements.test(lower)) return 'shouldStatements';
	if (REGEX_CACHE.catastrophizing.test(lower)) return 'catastrophizing';
	if (/(i'm|i am|he's|she's|they're)/.test(lower) && REGEX_CACHE.labeling.test(lower)) return 'labeling';
	if (REGEX_CACHE.personalizing.test(lower)) return 'personalizing';
	if (REGEX_CACHE.fortuneTelling.test(lower)) return 'fortuneTelling';
	
	return undefined;
}

function detectSentiment(theme: string): Sentiment {
	const lower = theme.toLowerCase();
	const hasPositive = REGEX_CACHE.positiveWords.test(lower);
	const hasNegative = REGEX_CACHE.negativeWords.test(lower);
	
	if (hasNegative && !hasPositive) return 'negative';
	if (hasPositive && !hasNegative) return 'positive';
	return 'neutral';
}

function hasNegation(theme: string): boolean {
	return REGEX_CACHE.negation.test(theme.toLowerCase());
}

// Consolidated pattern extraction to reduce compromise passes
function extractCbtPatterns(doc: any, themeCounts: Map<string, number>) {
	// Single pass for all patterns using batch matching
	const patterns = [
		{ match: '(not|no|never|nobody|nothing|nowhere) (#Verb+|#Adjective+|#Adverb+|#Noun+)', weight: 6, minLen: 5 },
		{ match: '(don\'t|doesn\'t|didn\'t|won\'t|wouldn\'t|can\'t|couldn\'t|shouldn\'t|wasn\'t|weren\'t|isn\'t|aren\'t|hasn\'t|haven\'t|hadn\'t) (#Verb+|#Adjective+|#Noun+)', weight: 6, minLen: 5 },
		{ match: '(always|never) #Verb+', weight: 5, minLen: 3 },
		{ match: '(should|must|have to|ought to|need to|supposed to) (#Verb+|#Adjective+)', weight: 5, minLen: 5 },
		{ match: '(terrible|awful|disaster|catastrophe|worst|horrible|dreadful) (#Noun+|#Verb+|#Adjective+)?', weight: 5, minLen: 5 },
		{ match: '(feeling|felt|feel|being) (#Adjective+|#Adverb+)', weight: 5, minLen: 5 },
	];

	for (const { match, weight, minLen } of patterns) {
		doc.match(match).forEach((m: CompromiseView) => {
			const phrase = m.text().toLowerCase();
			const clean = phrase.replace(REGEX_CACHE.cleanNonAlphaNum, "").trim();
			if (clean.length >= minLen) {
				themeCounts.set(clean, (themeCounts.get(clean) || 0) + weight);
			}
		});
	}

	// Labeling patterns (needs special handling)
	doc.match('(i\'m|i am|he\'s|she\'s|they\'re) (#Adjective+|#Noun+)').forEach(
		(match: CompromiseView) => {
			const phrase = match.text().toLowerCase();
			if (REGEX_CACHE.labeling.test(phrase)) {
				const clean = phrase.replace(REGEX_CACHE.cleanNonAlphaNum, "").trim();
				themeCounts.set(clean, (themeCounts.get(clean) || 0) + 6);
			}
		}
	);
}

// -----------------------------
// Overloads
// -----------------------------
export async function extractThemes(
	entries: EntryWithDate[],
	daysAgo?: number,
	themeLimit?: number,
	opts?: ExtractOpts & { detailed?: false }
): Promise<string[]>;
export async function extractThemes(
	entries: EntryWithDate[],
	daysAgo: number,
	themeLimit: number,
	opts: ExtractOpts & { detailed: true }
): Promise<ThemeScore[]>;

// -----------------------------
// Implementation
// -----------------------------
export async function extractThemes(
	entries: EntryWithDate[],
	daysAgo = 7,
	themeLimit = 30,
	opts: ExtractOpts = {}
): Promise<string[] | ThemeScore[]> {
	const useEmbeddings = opts.useEmbeddings ?? true;
	const mmrLambda = opts.mmrLambda ?? 0.7;
	const tauDays = opts.decayTauDays ?? 3;
	const maxSentencesForEmbed = opts.maxSentencesForEmbed ?? 800;
	const includeCbtMetadata = opts.includeCbtMetadata ?? false;
	const maxTokens = opts.maxTokens ?? 10000;

	// --- Date filtering ---
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
	const cutoffDateString = cutoffDate.toISOString().slice(0, 10);
	const recentEntries = entries.filter((e) => e.date >= cutoffDateString);
	if (recentEntries.length === 0) return [];

	// Join with truncation for very large inputs
	let textBlob = recentEntries.map((e) => e.text).join(" ");
	const tokens = textBlob.split(/\s+/);
	if (tokens.length > maxTokens) {
		// Truncate but try to keep recent entries weighted higher
		const avgPerEntry = Math.floor(maxTokens / recentEntries.length);
		textBlob = recentEntries.map(e => {
			const words = e.text.split(/\s+/).slice(0, avgPerEntry);
			return words.join(" ");
		}).join(" ");
	}

	const doc = nlp(textBlob);
	const themeCounts = new Map<string, number>();

	// --- Refined stopwords ---
	const stopWords = new Set<string>([
		"a", "an", "the", "and", "or", "but", "so",
		"i", "me", "it", "its", "he", "she", "him", "her",
		"we", "us", "you", "they", "them",
		"this", "that", "these", "those",
		"is", "am", "are", "was", "were", "be", "been", "being",
		"have", "has", "had", "do", "does", "did",
		"will", "would", "could", "may", "might",
		"get", "got", "go", "going",
		"to", "of", "for", "in", "on", "at", "with",
		"up", "down", "out", "off", "by", "from",
		"about", "above", "across", "after", "against", "along",
		"among", "around", "as", "behind", "below", "beneath",
		"beside", "between", "beyond", "both", "during",
		"except", "near", "outside", "over", "past", "per",
		"through", "throughout", "till", "under", "until",
		"upon", "within", "without",
		"then", "now", "once",
		"much", "many", "more", "most", "less", "least",
		"few", "little", "several", "some",
		"how", "however", "what", "when", "where", "whereas",
		"wherever", "whether", "which", "while", "who", "whom",
		"whose", "why",
		"also", "if", "main", "next", "other", "own",
		"same", "since", "still", "such", "than", "their",
		"there", "therefore", "though",
	]);

	// --- Step 1: Consolidated CBT pattern extraction ---
	extractCbtPatterns(doc, themeCounts);

	// --- Step 2: Entity extraction (optimized with single pass) ---
	const contextualPhrases = new Map<string, string>();

	// Batch process entities
	doc.match("(my|his|her|our|their) #Noun+ #Person").forEach(
		(match: CompromiseView) => {
			const full = match.text().toLowerCase();
			const person = match.match("#Person").text().toLowerCase();
			if (person) {
				contextualPhrases.set(person, full);
				const clean = full.replace(REGEX_CACHE.cleanNonAlphaNum, "").trim();
				if (clean.length > 2) {
					themeCounts.set(clean, (themeCounts.get(clean) || 0) + 5);
				}
			}
		}
	);

	// Process remaining entities
	const peopleArr: string[] = doc.people().out("array");
	const placesArr: string[] = doc.places().out("array");
	const orgsArr: string[] = doc.organizations().out("array");
	
	[...peopleArr, ...placesArr, ...orgsArr].forEach((entity: string) => {
		const lower = entity.toLowerCase();
		if (!contextualPhrases.has(lower)) {
			const clean = lower.replace(REGEX_CACHE.cleanNonAlphaNum, "").trim();
			if (clean.length > 2 && !stopWords.has(clean)) {
				themeCounts.set(clean, (themeCounts.get(clean) || 0) + 3);
			}
		}
	});

	// Noun phrases
	doc.match("#Noun+").forEach((match: CompromiseView) => {
		const phrase = match.text().toLowerCase();
		const words = phrase.split(/\s+/);
		const significantWords = words.filter(
			(w: string) => w.length > 1 && !stopWords.has(w)
		);
		if (
			significantWords.length >= 2 ||
			(significantWords.length === 1 && match.has("#ProperNoun"))
		) {
			const cleanPhrase = phrase.replace(REGEX_CACHE.cleanNonAlphaNum, "").trim();
			if (cleanPhrase && !stopWords.has(cleanPhrase) && cleanPhrase.length > 2) {
				const weight = cleanPhrase.split(/\s+/).length > 1 ? 5 : 3;
				themeCounts.set(cleanPhrase, (themeCounts.get(cleanPhrase) || 0) + weight);
			}
		}
	});

	// --- Step 3: N-grams (using iterator for memory efficiency) ---
	const rawTerms: string[] = doc.terms().out("array");
	const processedTokens = rawTerms
		.map((t: string) => t.toLowerCase().replace(REGEX_CACHE.cleanNonAlphaNum, ""))
		.filter((t: string) => t.length > 1 && !stopWords.has(t));

	// Process n-grams using iterator (avoids creating large arrays)
	for (const bi of generateNgramsIterator(processedTokens, 2)) {
		const theme = bi.join(" ");
		if (theme.length > 3) {
			themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
		}
	}

	for (const tri of generateNgramsIterator(processedTokens, 3)) {
		const theme = tri.join(" ");
		if (theme.length > 5) {
			themeCounts.set(theme, (themeCounts.get(theme) || 0) + 2);
		}
	}

	for (const four of generateNgramsIterator(processedTokens, 4)) {
		const theme = four.join(" ");
		if (theme.length > 7) {
			themeCounts.set(theme, (themeCounts.get(theme) || 0) + 3);
		}
	}

	if (themeCounts.size === 0) return [];

	// === Significance scoring ===
	type ThemeStats = {
		theme: string;
		freq: number;
		recencyWeighted: number;
		entries: Set<number>;
	};

	const dayMs = 86_400_000;
	const now = new Date();
	const stats = new Map<string, ThemeStats>();
	const themes = Array.from(themeCounts.keys());

	// Prepare sentences (optimized)
	const sentences: { text: string; date: Date; entryIndex: number }[] = [];
	recentEntries.forEach((entry, idx) => {
		const splits = (entry.text || "").split(/(?<=[.!?])\s+/g);
		for (const s of splits) {
			if (s) sentences.push({
				text: s,
				date: new Date(entry.date),
				entryIndex: idx,
			});
		}
	});

	// Single pass through entries for all themes
	recentEntries.forEach((entry, idx) => {
		const entryText = (entry.text || "").toLowerCase();
		const entryDate = new Date(entry.date);
		const w = Math.exp(
			-Math.max(0, now.getTime() - entryDate.getTime()) / (tauDays * dayMs)
		);

		for (const t of themes) {
			if (entryText.includes(t)) {
				const s = stats.get(t) ?? {
					theme: t,
					freq: 0,
					recencyWeighted: 0,
					entries: new Set<number>(),
				};
				s.freq += 1;
				s.recencyWeighted += w;
				s.entries.add(idx);
				stats.set(t, s);
			}
		}
	});

	// Prune weak themes
	for (const [t, s] of stats) {
		if (s.freq < 1 || t.length < 3) stats.delete(t);
	}
	if (stats.size === 0) return [];

	// Compute normalized scores
	const arr = Array.from(stats.values());
	const maxFreq = Math.max(1e-9, ...arr.map((s) => s.freq));
	const maxCov = Math.max(1e-9, ...arr.map((s) => s.entries.size));
	const maxRec = Math.max(1e-9, ...arr.map((s) => s.recencyWeighted));

	const score = new Map<string, number>();
	for (const [t, s] of stats) {
		const freqN = s.freq / maxFreq;
		const covN = s.entries.size / maxCov;
		const recN = s.recencyWeighted / maxRec;
		const lengthBonus = Math.log(t.split(/\s+/).length + 1) + 1;
		score.set(t, (0.3 * freqN + 0.4 * covN + 0.3 * recN) * lengthBonus);
	}

	// === MMR diversity (optimized) ===
	const lambda = mmrLambda;
	const pool = Array.from(stats.keys()).sort(
		(a, b) => score.get(b)! - score.get(a)!
	);
	const selected: string[] = [];
	const k = Math.min(themeLimit, pool.length);

	let candVec: Map<string, Float32Array> | null = null;

	if (useEmbeddings) {
		try {
			const limitedSentences = sentences.slice(0, maxSentencesForEmbed);
			const embedder = await getEmbedder();
			
			// Batch embed for efficiency
			const sentMatrix: number[][] = (
				await embedder(
					limitedSentences.map((s) => s.text),
					{ pooling: "mean", normalize: true }
				)
			).data;
			const sentenceVectors: Float32Array[] = sentMatrix.map((row) =>
				Float32Array.from(row)
			);

			candVec = new Map<string, Float32Array>();
			
			// Pre-compute theme vectors
			for (const t of pool) {
				const idxs: number[] = [];
				for (let i = 0; i < limitedSentences.length; i++) {
					if (limitedSentences[i].text.toLowerCase().includes(t)) {
						idxs.push(i);
					}
				}
				if (idxs.length > 0) {
					candVec.set(
						t,
						normalize(avgVectors(idxs.map((i) => sentenceVectors[i])))
					);
				}
			}
		} catch {
			candVec = null;
		}
	}

	// MMR selection loop (optimized with early termination)
	const selectedSet = new Set<string>();
	while (selected.length < k) {
		let best: string | null = null;
		let bestVal = -Infinity;

		for (const t of pool) {
			if (selectedSet.has(t)) continue;
			
			const base = score.get(t) ?? 0;
			let redundancy = 0;

			if (selected.length > 0) {
				if (candVec) {
					const v = candVec.get(t);
					if (v) {
						for (const s of selected) {
							const u = candVec.get(s);
							if (u) {
								const sim = cosine(v, u);
								if (sim > redundancy) redundancy = sim;
							}
						}
					}
				} else {
					const sT = stats.get(t)!.entries;
					for (const s of selected) {
						const sim = jaccard(sT, stats.get(s)!.entries);
						if (sim > redundancy) redundancy = sim;
					}
				}
			}

			const val = lambda * base - (1 - lambda) * redundancy;
			if (val > bestVal) {
				bestVal = val;
				best = t;
			}
		}

		if (!best) break;
		selected.push(best);
		selectedSet.add(best);
	}

	// Final filtering
	const filtered = selected.filter(
		(t) => t.length > 2 && !stopWords.has(t) && !REGEX_CACHE.onlyDigits.test(t)
	);

	const genericWords = new Set([
		'thing', 'things', 'way', 'ways', 'people', 'person',
		'something', 'someone', 'lot', 'bit', 'stuff', 'kind', 'sort'
	]);

	const nonGeneric = filtered.filter(theme => {
		const words = theme.split(/\s+/);
		if (words.length > 1) return true;
		return !genericWords.has(theme);
	});

	const preciseThemes = nonGeneric.filter((theme, idx) => {
		const thisFreq = stats.get(theme)?.freq || 0;
		const thisScore = score.get(theme) || 0;
		
		return !nonGeneric.some((other, otherIdx) => {
			if (idx === otherIdx) return false;
			const otherFreq = stats.get(other)?.freq || 0;
			const otherScore = score.get(other) || 0;
			
			return other.includes(theme) && 
				   otherFreq >= thisFreq * 0.7 && 
				   otherScore >= thisScore * 0.7;
		});
	});

	// Return with or without CBT metadata
	if (opts.detailed || includeCbtMetadata) {
		return preciseThemes.map((t) => {
			const result: ThemeScore = { 
				theme: t, 
				score: score.get(t) ?? 0,
			};
			
			if (includeCbtMetadata || opts.detailed) {
				result.category = categorizeTheme(t);
				result.distortionType = detectDistortion(t);
				result.hasNegation = hasNegation(t);
				result.sentiment = detectSentiment(t);
				result.frequency = stats.get(t)?.freq || 0;
				result.recency = stats.get(t)?.recencyWeighted || 0;
			}
			
			return result;
		});
	}
	
	return preciseThemes;
}