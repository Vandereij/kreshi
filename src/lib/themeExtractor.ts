// lib/themeExtractor.ts

// Define a clear type for the entries this function expects
type EntryWithDate = {
  text: string;
  date: string; // Assumes a 'YYYY-MM-DD' format for reliable comparison
};

/**
 * Extracts the most common, significant words (themes) from journal entries
 * within a specific number of recent days.
 * @param entries An array of entry objects, each with 'text' and 'date' properties.
 * @param daysAgo The number of days in the past to include in the analysis (e.g., 7 for the last week).
 * @param themeLimit The maximum number of top themes to return.
 * @returns An array of the most frequent words from the specified period.
 */
export function extractThemes(
  entries: EntryWithDate[],
  daysAgo = 14, // Default to the last 14 days for a good balance
  themeLimit = 15
): string[] {
  // --- Start of Changes ---

  // 1. Calculate the cutoff date as a string in 'YYYY-MM-DD' format
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
  const cutoffDateString = cutoffDate.toISOString().slice(0, 10);

  // 2. Filter entries to include only those from the specified time window
  const recentEntries = entries.filter(entry => {
    // Direct string comparison is reliable and avoids timezone issues
    // as long as the date format is consistently 'YYYY-MM-DD'.
    return entry.date >= cutoffDateString;
  });

  // If there are no entries in the recent period, exit early.
  if (recentEntries.length === 0) {
    return [];
  }

  // --- End of Changes ---

  // The rest of the logic remains the same, but operates on the filtered `recentEntries`
  const textBlob = recentEntries.map(e => e.text.toLowerCase()).join(" ");

  const stopWords = new Set([
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
    "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
    "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
    "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
    "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
    "the", "and", "but", "if", "or", "because", "as", "until", "while", "of",
    "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to", "from",
    "up", "down", "in", "out", "on", "off", "over", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why", "how",
    "all", "any", "both", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
    "very", "s", "t", "can", "will", "just", "don", "should", "now", "ve", "ll"
  ]);

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