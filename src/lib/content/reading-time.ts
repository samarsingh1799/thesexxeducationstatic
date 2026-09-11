const WORDS_PER_MINUTE = 225;

/** Rough estimate from the rendered HTML's word count — good enough for a "N min read" label, not meant to be exact. */
export function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
