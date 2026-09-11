import Link from "next/link";
import type { Author } from "@/types/content";

type ArticleMetaProps = {
  author: Author;
  publishedAt: string;
  modifiedAt?: string;
  readingMinutes?: number;
  size?: "default" | "compact";
  locale: string;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
}

/** The byline/date/reading-time row: `By {Author} · {Date} · {N min read}`. Shared between ArticleCard (compact) and the article page header (default). */
export function ArticleMeta({ author, publishedAt, modifiedAt, readingMinutes, size = "default", locale }: ArticleMetaProps) {
  const wasUpdated = Boolean(modifiedAt && modifiedAt !== publishedAt);
  const textSize = size === "compact" ? "text-xs" : "text-sm";

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted ${textSize}`}>
      <span>
        By{" "}
        <Link href={`/${locale}/author/${author.slug}`} className="font-medium text-ink hover:underline">
          {author.name}
        </Link>
      </span>
      <span aria-hidden="true">&middot;</span>
      <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
      {size === "default" && wasUpdated && modifiedAt && (
        <>
          <span aria-hidden="true">&middot;</span>
          <span>
            Updated <time dateTime={modifiedAt}>{formatDate(modifiedAt)}</time>
          </span>
        </>
      )}
      {typeof readingMinutes === "number" && (
        <>
          <span aria-hidden="true">&middot;</span>
          <span className="inline-flex items-center gap-1">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 5.5V10l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {readingMinutes} min read
          </span>
        </>
      )}
    </div>
  );
}
