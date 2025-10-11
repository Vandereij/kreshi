// lib/themeExtractorHybrid.ts
import nlp from 'compromise';

// Define the type for the entries
type EntryWithDate = {
  text: string;
  date: string; // Assumes a 'YYYY-MM-DD' format
};

/**
 * A simple, dependency-free function to generate n-grams (e.g., bigrams, trigrams).
 * @param tokens - An array of words.
 * @param n - The size of the n-gram (e.g., 2 for bigrams).
 * @returns An array of n-grams, where each n-gram is an array of words.
 */
function generateNgrams(tokens: string[], n: number): string[][] {
  const ngrams: string[][] = [];
  if (n > tokens.length || n < 1) {
    return [];
  }
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n));
  }
  return ngrams;
}

export function extractThemes(
  entries: EntryWithDate[],
  daysAgo = 7,
  themeLimit = 30
): string[] {
  // --- Date filtering logic (no changes) ---
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
  const cutoffDateString = cutoffDate.toISOString().slice(0, 10);
  const recentEntries = entries.filter(entry => entry.date >= cutoffDateString);

  if (recentEntries.length === 0) {
    return [];
  }

  const textBlob = recentEntries.map(e => e.text).join(' ');
  const doc = nlp(textBlob);
  const themeCounts = new Map<string, number>();

  // --- Expanded and refined Stop Words list ---
  // Added more pronouns, contractions, and very common uninformative words
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "so", "i", "me", "to", "of",
    "for", "in", "on", "at", "with", "is", "am", "are", "was", "were", "it",
    "its", // 'its' (without apostrophe) as a possessive pronoun
    "he", "she", "him", "her", "we", "us", "you", "your", "they", "them",
    "this", "that", "these", "those", "can", "will", "would", "could", // 'should' is removed
    "have", "has", "had", "do", "does", "did", "be", "been", "being", "not",
    "no", "yes", "up", "down", "out", "off", "then", "now",
    "much", "many", "more", "most", "less", "least", "also", "about", "above",
    "across", "after", "again", "against", "along", "among", "around", "as",
    "behind", "below", "beneath", "beside", "between", "beyond", "both",
    "by", "during", "except", "few", "from", "further", "here",
    "how", "however", "if",
    "little", "main", "may", "might",
    "near", "next", "once", "other", "outside", "over",
    "own", "past", "per", "perhaps",
    "same", "several", "since",
    "still", "such", "than",
    "their", "then", "there", "there's", "therefore", "they", "though", "through",
    "throughout", "till", "too", "under", "until", "upon", "when", "where",
    "whereas", "wherever", "whether", "which", "while", "who", "whom", "whose",
    "why", "within", "without", "yet", "get", "got", "go", "going",
    "one", "day", "week", "month", "year",
    // Common contractions and parts of speech that often show up as noise
    "i'm", "i've", "i'll", "i'd", "you're", "you've", "we're", "we've", "he's", "she's",
    "it's", "they're", "they've", "don't", "doesn't", "didn't", "won't", "wouldn't",
    "can't", "couldn't", "shouldn't", "wasn't", "weren't", "isn't", "aren't",
    // Time references, often not themes
    "today", "yesterday", "tomorrow",
  ]);


  // --- Step 1: Extract high-value entities with Compromise ---
  const compromiseEntities: string[] = [];

  // Directly get multi-word Proper Nouns (People, Places, Organizations)
  doc.people().forEach((p) => compromiseEntities.push(p.text()));
  doc.places().forEach((p) => compromiseEntities.push(p.text()));
  doc.organizations().forEach((o) => compromiseEntities.push(o.text()));

  // Add Multi-word noun phrases detected by Compromise.
  // We prioritize phrases that are at least two significant words.
  // Use .json() to get more structured data for multi-word matches
  doc.match('#Noun+').forEach(match => { // Match one or more nouns
    const phrase = match.text().toLowerCase();
    // Filter out phrases that are just stop words or too short
    const words = phrase.split(' ');
    const significantWords = words.filter(w => w.length > 1 && !stopWords.has(w));
    
    // Only consider if there are at least two significant words or it's a known multi-word proper noun Compromise caught
    if (significantWords.length >= 2 || (significantWords.length === 1 && match.has('#ProperNoun'))) {
       // Ensure there's no trailing punctuation after cleaning
       const cleanPhrase = phrase.replace(/[^a-z0-9 ]/g, '').trim();
       if (cleanPhrase && !stopWords.has(cleanPhrase) && cleanPhrase.length > 2) {
         compromiseEntities.push(cleanPhrase);
       }
    }
  });

  compromiseEntities.forEach(entity => {
    // Ensure entities from Compromise are clean, unique, and meaningful
    const cleanEntity = entity.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    // Only add if not a stop word and of reasonable length
    if (cleanEntity && cleanEntity.length > 2 && !stopWords.has(cleanEntity)) {
      themeCounts.set(cleanEntity, (themeCounts.get(cleanEntity) || 0) + 3); // Boost score
    }
  });

  // --- Step 2: Extract common phrases (bigrams) with our own function ---
  
  const rawTerms = doc.terms().out('array');

  const cleanedAndFilteredSingleTokens = rawTerms
    .map((t: string)  => t.toLowerCase()) // Convert to lowercase first
    // Aggressive cleaning to remove any non-alphanumeric, but keep internal apostrophes for now
    .map((t: string)  => t.replace(/[^a-z0-9']/g, '')) 
    // Filter out tokens that are:
    // 1. Single characters (like 'i', 'a', 'x')
    // 2. Or are in the stopWords set (even if multi-character, e.g., 'the', 'is', 'i'm')
    // Special handling for 'i' (lowercase) - ensure it's removed if it slipped through as a single char
    .filter((t: string)  => t.length > 1 && !stopWords.has(t));

  // Now generate bigrams only from these highly filtered tokens
  const bigrams = generateNgrams(cleanedAndFilteredSingleTokens, 2);

  bigrams.forEach(bigram => {
    const theme = bigram.join(' ');
    // Filter out bigrams that are still too short or might have sneaked in
    // as a stop-word-like phrase (e.g., if "my work" isn't specific enough)
    if (theme.length > 3 && !stopWords.has(theme)) {
        themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1); // Normal score
    }
  });

  // --- Step 3: Combine, sort, and return the top themes ---
  const finalThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, themeLimit)
    .map(([theme]) => theme);

  // Final cleanup: ensure no single stop words or very short, non-meaningful themes
  return finalThemes.filter(t => t.length > 2 && !stopWords.has(t) && !(/^\d+$/.test(t))); // Also filter out just numbers
}