import { sanitizeArticleHtml } from "@/lib/content/sanitize";

/** Article body copy — real WordPress markup (headings, paragraphs, lists, links, images, blockquotes, tables, allowlisted embeds), sanitized once here rather than trusting it verbatim. See lib/content/sanitize.ts for the trust model. */
export function ArticleBody({ html }: { html: string }) {
  return (
    <div
      className="prose prose-neutral max-w-none prose-headings:font-semibold prose-a:text-accent"
      style={{ fontSize: "var(--article-font-size)" }}
      dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(html) }}
    />
  );
}
