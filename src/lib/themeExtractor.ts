// lib/themeExtractorHybrid.ts
import nlp from "compromise";

// -----------------------------
// Types
// -----------------------------
export type ThemeScore = { theme: string; score: number };

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
};

interface CompromiseView {
	text(): string;
	has(tag: string): boolean;
	match(pattern: string): CompromiseView;
}

// -----------------------------
// Helpers
// -----------------------------

/** dependency-free n-grams */
function generateNgrams(tokens: string[], n: number): string[][] {
	const ngrams: string[][] = [];
	if (n > tokens.length || n < 1) return [];
	for (let i = 0; i <= tokens.length - n; i++) {
		ngrams.push(tokens.slice(i, i + n));
	}
	return ngrams;
}

// ✅ Typed embedder (MiniLM) via @xenova/transformers (loaded lazily)
type FeatureExtractor = (
	inputs: string | string[],
	options?: { pooling?: "mean" | "none"; normalize?: boolean }
) => Promise<{ data: number[][] }>;

let embedderPromise: Promise<FeatureExtractor> | null = null;
async function getEmbedder(): Promise<FeatureExtractor> {
	if (!embedderPromise) {
		const { pipeline } = await import("@xenova/transformers"); // no network calls; WASM local
		embedderPromise = pipeline(
			"feature-extraction",
			"Xenova/all-MiniLM-L6-v2"
		) as Promise<FeatureExtractor>;
	}
	return embedderPromise;
}

// Small vector helpers
function cosine(a: Float32Array, b: Float32Array) {
	let dot = 0,
		na = 0,
		nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
function avgVectors(vecs: Float32Array[]) {
	const out = new Float32Array(vecs[0].length);
	for (const v of vecs) for (let i = 0; i < v.length; i++) out[i] += v[i];
	for (let i = 0; i < out.length; i++) out[i] /= vecs.length;
	return out;
}
function normalize(v: Float32Array) {
	let n = 0;
	for (let i = 0; i < v.length; i++) n += v[i] * v[i];
	n = Math.sqrt(n) || 1;
	const out = new Float32Array(v.length);
	for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
	return out;
}
function jaccard(a: Set<number>, b: Set<number>) {
	let inter = 0;
	for (const x of a) if (b.has(x)) inter++;
	const union = a.size + b.size - inter;
	return union === 0 ? 0 : inter / union;
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

	// --- Date filtering ---
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
	const cutoffDateString = cutoffDate.toISOString().slice(0, 10);
	const recentEntries = entries.filter((e) => e.date >= cutoffDateString);
	if (recentEntries.length === 0) return [];

	// Join only recent text into one doc for tokenization
	const textBlob = recentEntries.map((e) => e.text).join(" ");
	const doc = nlp(textBlob);
	const themeCounts = new Map<string, number>();

	// --- Stopwords ---
	const stopWords = new Set<string>([
		"a",
		"an",
		"the",
		"and",
		"or",
		"but",
		"so",
		"i",
		"me",
		"to",
		"of",
		"for",
		"in",
		"on",
		"at",
		"with",
		"is",
		"am",
		"are",
		"was",
		"were",
		"it",
		"its",
		"he",
		"she",
		"him",
		"her",
		"we",
		"us",
		"you",
		"your",
		"they",
		"them",
		"this",
		"that",
		"these",
		"those",
		"can",
		"will",
		"would",
		"could",
		"have",
		"has",
		"had",
		"do",
		"does",
		"did",
		"be",
		"been",
		"being",
		"not",
		"no",
		"yes",
		"up",
		"down",
		"out",
		"off",
		"then",
		"now",
		"much",
		"many",
		"more",
		"most",
		"less",
		"least",
		"also",
		"about",
		"above",
		"across",
		"after",
		"again",
		"against",
		"along",
		"among",
		"around",
		"as",
		"behind",
		"below",
		"beneath",
		"beside",
		"between",
		"beyond",
		"both",
		"by",
		"during",
		"except",
		"few",
		"from",
		"further",
		"here",
		"how",
		"however",
		"if",
		"little",
		"main",
		"may",
		"might",
		"near",
		"next",
		"once",
		"other",
		"outside",
		"over",
		"own",
		"past",
		"per",
		"perhaps",
		"same",
		"several",
		"since",
		"still",
		"such",
		"than",
		"their",
		"then",
		"there",
		"there's",
		"therefore",
		"they",
		"though",
		"through",
		"throughout",
		"till",
		"too",
		"under",
		"until",
		"upon",
		"when",
		"where",
		"whereas",
		"wherever",
		"whether",
		"which",
		"while",
		"who",
		"whom",
		"whose",
		"why",
		"within",
		"without",
		"yet",
		"get",
		"got",
		"go",
		"going",
		"one",
		"day",
		"week",
		"month",
		"year",
		"i'm",
		"i've",
		"i'll",
		"i'd",
		"you're",
		"you've",
		"we're",
		"we've",
		"he's",
		"she's",
		"it's",
		"they're",
		"they've",
		"don't",
		"doesn't",
		"didn't",
		"won't",
		"wouldn't",
		"can't",
		"couldn't",
		"shouldn't",
		"wasn't",
		"weren't",
		"isn't",
		"aren't",
		"today",
		"yesterday",
		"tomorrow",
	]);

	// --- Step 1: Compromise entities & noun phrases WITH CONTEXT ---
	const compromiseEntities: string[] = [];
	const contextualPhrases = new Map<string, string>(); // name -> context phrase

	// Extract people with possessive context (e.g., "my sister", "his friend")
	doc.match("(my|his|her|our|their) #Noun+ #Person").forEach(
		(match: CompromiseView) => {
			const full = match.text().toLowerCase();
			const person = match.match("#Person").text().toLowerCase();
			if (person) {
				contextualPhrases.set(person, full);
				compromiseEntities.push(full); // Add the full contextual phrase
			}
		}
	);

	doc.people()
		.out("array")
		.forEach((p: string) => {
			const lower = p.toLowerCase();
			// Only add standalone if not already in contextual phrases
			if (!contextualPhrases.has(lower)) {
				compromiseEntities.push(p);
			}
		});
	doc.places()
		.out("array")
		.forEach((p: string) => compromiseEntities.push(p));
	doc.organizations()
		.out("array")
		.forEach((o: string) => compromiseEntities.push(o));

	// ✅ Typed match object
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
			const cleanPhrase = phrase.replace(/[^a-z0-9 ]/g, "").trim();
			if (
				cleanPhrase &&
				!stopWords.has(cleanPhrase) &&
				cleanPhrase.length > 2
			) {
				compromiseEntities.push(cleanPhrase);
			}
		}
	});

	compromiseEntities.forEach((entity: string) => {
		const cleanEntity = entity
			.toLowerCase()
			.replace(/[^a-z0-9 ]/g, "")
			.trim();
		if (
			cleanEntity &&
			cleanEntity.length > 2 &&
			!stopWords.has(cleanEntity)
		) {
			// Higher weight for contextual phrases (e.g., "my sister")
			const weight = cleanEntity.split(/\s+/).length > 1 ? 5 : 3;
			themeCounts.set(
				cleanEntity,
				(themeCounts.get(cleanEntity) || 0) + weight
			);
		}
	});

	// --- Step 2: Bigrams AND Trigrams from filtered tokens ---
	const rawTerms: string[] = doc.terms().out("array"); // ✅ typed
	const tokens = rawTerms
		.map((t: string) => t.toLowerCase())
		.map((t: string) => t.replace(/[^a-z0-9']/g, ""))
		.filter((t: string) => t.length > 1 && !stopWords.has(t));

	// Bigrams
	const bigrams = generateNgrams(tokens, 2);
	bigrams.forEach((bi: string[]) => {
		const theme = bi.join(" ");
		if (theme.length > 3 && !stopWords.has(theme)) {
			themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
		}
	});

	// Trigrams (for better context)
	const trigrams = generateNgrams(tokens, 3);
	trigrams.forEach((tri: string[]) => {
		const theme = tri.join(" ");
		if (theme.length > 5 && !stopWords.has(theme)) {
			themeCounts.set(theme, (themeCounts.get(theme) || 0) + 2);
		}
	});

	if (themeCounts.size === 0) return [];

	// === Significance scoring (per-entry presence + recency) ===
	type ThemeStats = {
		theme: string;
		freq: number;
		coverage: number; // derived from entries.size
		recencyWeighted: number;
		entries: Set<number>;
	};

	const dayMs = 86_400_000;
	const now = new Date();
	const stats = new Map<string, ThemeStats>();
	const themes = Array.from(themeCounts.keys());

	// Prepare sentences (for embeddings) + per-entry indices
	const sentences: { text: string; date: Date; entryIndex: number }[] = [];
	recentEntries.forEach((entry, idx) => {
		const splits = (entry.text || "")
			.split(/(?<=[.!?])\s+/g)
			.filter(Boolean);
		splits.forEach((s: string) =>
			sentences.push({
				text: s,
				date: new Date(entry.date),
				entryIndex: idx,
			})
		);
	});

	// Presence + recency decay
	recentEntries.forEach((entry, idx) => {
		const entryText = (entry.text || "").toLowerCase();
		const entryDate = new Date(entry.date);
		const w = Math.exp(
			-Math.max(0, now.getTime() - entryDate.getTime()) /
				(tauDays * dayMs)
		);

		for (const t of themes) {
			if (entryText.includes(t)) {
				const s = stats.get(t) ?? {
					theme: t,
					freq: 0,
					coverage: 0,
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

	// prune weak themes - more lenient threshold
	for (const [t, s] of stats) {
		if (s.freq < 1 || t.length < 3) stats.delete(t);
	}
	if (stats.size === 0) return [];

	const arr = Array.from(stats.values());
	const maxOf = (xs: number[]) => Math.max(1e-9, ...xs);
	const maxFreq = maxOf(arr.map((s) => s.freq));
	const maxCov = maxOf(arr.map((s) => s.entries.size));
	const maxRec = maxOf(arr.map((s) => s.recencyWeighted));

	const score = new Map<string, number>();
	for (const [t, s] of stats) {
		const freqN = s.freq / maxFreq;
		const covN = s.entries.size / maxCov;
		const recN = s.recencyWeighted / maxRec;
		// Adjusted weights: favor frequency slightly less, coverage more
		score.set(t, 0.3 * freqN + 0.4 * covN + 0.3 * recN);
	}

	// === MMR diversity ===
	const lambda = mmrLambda;
	const pool = Array.from(stats.keys()).sort(
		(a, b) => score.get(b)! - score.get(a)!
	);
	const selected: string[] = [];
	const k = Math.min(themeLimit, pool.length);

	// Try embeddings; fallback to Jaccard if unavailable
	let candVec: Map<string, Float32Array> | null = null;

	if (useEmbeddings) {
		try {
			const limitedSentences = sentences.slice(0, maxSentencesForEmbed);
			const embedder = await getEmbedder();
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
			for (const t of pool) {
				const idxs: number[] = [];
				for (let i = 0; i < limitedSentences.length; i++) {
					if (limitedSentences[i].text.toLowerCase().includes(t))
						idxs.push(i);
				}
				if (idxs.length === 0) continue;
				candVec.set(
					t,
					normalize(avgVectors(idxs.map((i) => sentenceVectors[i])))
				);
			}
		} catch {
			candVec = null; // silently fallback
		}
	}

	while (selected.length < k) {
		let best: string | null = null;
		let bestVal = -Infinity;

		for (const t of pool) {
			if (selected.includes(t)) continue;
			const base = score.get(t) ?? 0;

			let redundancy = 0;
			if (selected.length > 0) {
				if (candVec) {
					const v = candVec.get(t);
					redundancy = v
						? Math.max(
								...selected.map((s) => {
									const u = candVec!.get(s);
									return u ? cosine(v, u) : 0;
								})
						  )
						: 0;
				} else {
					const sT = stats.get(t)!.entries;
					redundancy = Math.max(
						...selected.map((s) =>
							jaccard(sT, stats.get(s)!.entries)
						)
					);
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
	}

	const filtered = selected.filter(
		(t) => t.length > 2 && !stopWords.has(t) && !/^\d+$/.test(t)
	);

	// Return shape by `detailed` flag (overloads ensure proper typing)
	if (opts.detailed) {
		return filtered.map((t) => ({ theme: t, score: score.get(t) ?? 0 }));
	}
	return filtered;
}
