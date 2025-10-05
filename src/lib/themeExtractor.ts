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
  const textBlob = recentEntries.map(e => e.text.toLowerCase()).join(" ");

  // --- START: REFINED STOP WORD LIST ---
  // This list is much safer for journal entries. It avoids removing words
  // that indicate negation, intensity, or emotional direction.
  const stopWords = new Set([
    // Articles
    "a", "an", "the",
    // Conjunctions
    "and", "but", "or", "so", "while", "because",
    // Pronouns
    "i", "me", "my", "myself", "we", "our", "you", "your", "he", "him", "his",
    "she", "her", "it", "its", "they", "them", "their",
    // Prepositions (only the most common that are less likely to be part of key phrases)
    "of", "at", "by", "for", "with", "from", "to",
    // Common verbs that add little meaning on their own
    "am", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did",
    // Generic terms
    "what", "which", "who", "when", "where", "why", "how", "this", "that"
  ]);
  // --- END: REFINED STOP WORD LIST ---

  const wordCounts = new Map<string, number>();

  textBlob
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .forEach(word => {
      if (word && !stopWords.has(word) && word.length > 2) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, themeLimit)
    .map(([word]) => word);
}