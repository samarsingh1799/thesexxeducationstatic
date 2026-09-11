/**
 * Article content comes from WordPress editors, not arbitrary site
 * visitors — the primary trust boundary is "who has WordPress access,"
 * the same as any headless-WordPress site. This is defense-in-depth on
 * top of that: strip the constructs that would let a compromised editor
 * account, a compromised plugin, or a supply-chain issue in a WordPress
 * dependency inject executable script into every reader's browser.
 *
 * Deliberately NOT a full HTML sanitizer library (DOMPurify etc.):
 * those need a real DOM implementation, which doesn't exist in the
 * Workers runtime, and pulling in jsdom is both heavy and not edge-
 * compatible. This targets the specific dangerous constructs instead of
 * attempting to fully parse/rebuild the HTML tree.
 */

const ALLOWED_IFRAME_HOSTS = ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"];

function stripDangerousIframes(html: string): string {
  return html.replace(/<iframe\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\ssrc=["']([^"']+)["']/i);
    if (!srcMatch) return "";
    try {
      const host = new URL(srcMatch[1], "https://placeholder.invalid").hostname;
      return ALLOWED_IFRAME_HOSTS.includes(host) ? tag : "";
    } catch {
      return "";
    }
  });
}

export function sanitizeArticleHtml(html: string): string {
  return stripDangerousIframes(html)
    // <script>/<style>/<object>/<embed> and their content — never legitimate in article body copy.
    .replace(/<(script|style|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|object|embed)\b[^>]*\/?>(?!.*<\/\1>)/gi, "")
    // Inline event handlers (onclick, onerror, onload, ...) on any element.
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    // javascript:/vbscript: URLs in href/src.
    .replace(/\s(href|src)\s*=\s*(["'])\s*(javascript|vbscript):[^"']*\2/gi, "");
}
