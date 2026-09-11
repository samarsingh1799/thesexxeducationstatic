/**
 * Decodes the HTML entities WordPress's REST API emits in plain-text
 * fields (`title.rendered`, `excerpt.rendered`'s stray "[&hellip;]", term
 * names) — never applied to `content.rendered`, where entities are real,
 * necessary HTML a browser decodes correctly on render.
 */
const NAMED_ENTITIES: Record<string, string> = {
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
  "&amp;": "&",
  "&quot;": '"',
  "&#039;": "'",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&[a-zA-Z]+;/g, (entity) => NAMED_ENTITIES[entity] ?? entity)
    .trim();
}

/** Strips WordPress's auto-generated excerpt down to plain text (used for meta descriptions, card previews). */
export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).trim();
}
