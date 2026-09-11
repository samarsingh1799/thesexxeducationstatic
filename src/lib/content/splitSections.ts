export type ArticleSection = { id: string; html: string };
export type SplitSectionsResult = { introHtml: string; sections: ArticleSection[] };

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 4;

/**
 * Splits the (already TOC-id-annotated) article HTML into top-level `<h2>`
 * boundaries, for the multi-column article layout.
 */
export function splitSections(html: string): SplitSectionsResult | null {
  const h2Pattern = /<h2\b[^>]*>[\s\S]*?<\/h2>/gi;
  const idPattern = /\bid\s*=\s*["']([^"']+)["']/i;

  const starts: number[] = [];
  const ids: string[] = [];

  for (const match of html.matchAll(h2Pattern)) {
    if (match.index === undefined) continue;
    starts.push(match.index);
    ids.push(match[0].match(idPattern)?.[1] ?? `section-${starts.length}`);
  }

  if (starts.length < MIN_COLUMNS || starts.length > MAX_COLUMNS) {
    return null;
  }

  const introHtml = html.slice(0, starts[0]);
  const sections: ArticleSection[] = starts.map((start, index) => ({
    id: ids[index],
    html: html.slice(start, starts[index + 1] ?? html.length),
  }));

  return { introHtml, sections };
}
