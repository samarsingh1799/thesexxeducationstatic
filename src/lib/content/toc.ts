import { stripHtml } from "./html";

export type TocHeading = { id: string; text: string; level: 2 | 3 };
export type TocResult = { html: string; headings: TocHeading[] };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Walks the article HTML for <h2>/<h3> headings, assigns each a stable,
 * de-duplicated `id`, and returns both the id-annotated HTML and the
 * heading list for a plain server-rendered <nav> of real `<a href="#id">`
 * anchors — no client JS, no DOM-reading useEffect.
 */
export function buildTableOfContents(html: string): TocResult {
  // WordPress content occasionally contains a stray <h1> (an authoring
  // mistake in the block editor) — the article's one true H1 is the page
  // title, so any H1 inside the body is demoted to H2 to avoid shipping
  // duplicate H1s.
  const withoutStrayH1 = html.replace(/<h1(\s[^>]*)?>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");

  const headings: TocHeading[] = [];
  const seenSlugs = new Map<string, number>();

  const processedHtml = withoutStrayH1.replace(
    /<h([23])((?:\s+[^>]*)?)>([\s\S]*?)<\/h\1>/gi,
    (match, levelStr: string, attrs: string, inner: string) => {
      const level = Number(levelStr) as 2 | 3;
      const text = stripHtml(inner);
      if (!text) return match;

      const existingId = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
      const baseId = existingId || slugify(text) || `section-${headings.length + 1}`;

      const count = seenSlugs.get(baseId) ?? 0;
      seenSlugs.set(baseId, count + 1);
      const id = count > 0 ? `${baseId}-${count + 1}` : baseId;

      headings.push({ id, text, level });

      const attrsWithoutId = attrs.replace(/\bid\s*=\s*["'][^"']*["']/i, "");
      return `<h${level}${attrsWithoutId} id="${id}">${inner}</h${level}>`;
    }
  );

  return { html: processedHtml, headings };
}
