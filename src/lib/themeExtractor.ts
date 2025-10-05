// lib/themeExtractor.ts

// Define a clear type for the entries this function expects
type EntryWithDate = {
  text: string;
  date: string; // Assumes a 'YYYY-MM-DD' format for reliable comparison
};

export function extractThemes(
  entries: EntryWithDate[],
  daysAgo = 14,
  themeLimit = 15
): string[] {
  // ... (the date filtering logic remains the same) ...
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
  const cutoffDateString = cutoffDate.toISOString().slice(0, 10);
  const recentEntries = entries.filter(entry => entry.date >= cutoffDateString);
  if (recentEntries.length === 0) {
    return [];
  }

  // --- START: REFINED STOP WORD LIST ---
  // This list is much safer for journal entries. It avoids removing words
  // that indicate negation, intensity, or emotional direction.
  const stopWords = new Set([
    // Articles
    "a", "an", "the",
    // Conjunctions
    "and", "but", "or", "so", "while", "because",
    // Prepositions (only the most common that are less likely to be part of key phrases)
    "of", "at", "by", "for", "with", "from", "to",
    // Common verbs that add little meaning on their own
    "am", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did",
    // Generic terms
    "what", "which", "who", "when", "where", "why", "how", "this", "that"
  ]);
  // --- END: REFINED STOP WORD LIST ---

  const phraseCounts = new Map<string, number>();
  // const wordCounts = new Map<string, number>();

  for (const entry of recentEntries) {
    const text = entry.text.toLowerCase().replace(/[^\w\s]/g, " ");
    const words = text.split(/\s+/).filter(word => word && !stopWords.has(word));

    // Count single words (unigrams)
    for (const word of words) {
      if (word.length > 2) {
        phraseCounts.set(word, (phraseCounts.get(word) || 0) + 1);
      }
    }

    // Count pairs of words (bigrams)
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      // Give a slight boost to bigrams to prioritize them
      phraseCounts.set(bigram, (phraseCounts.get(bigram) || 0) + 1.5);
    }
  }

  return Array.from(phraseCounts.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, themeLimit)         // Take the top themes
    .map(([phrase]) => phrase);   // Return just the phrase
}