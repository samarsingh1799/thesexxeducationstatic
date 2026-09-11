import type { PostSummary } from "@/types/content";
import { ArticleCard } from "./ArticleCard";

type PostGridProps = {
  items: PostSummary[];
  locale: string;
  /** Gives the first post a hero treatment (category/tag pages); author pages pass false. */
  showHero: boolean;
  noArticlesLabel: string;
};

/**
 * Pure, hook-free presentational grid — no "use client", no data fetching.
 * Deliberately factored out of PaginatedPostGrid so the exact same markup
 * can be rendered twice: once directly (server-side, real data, no client
 * dependency at all — used as the <Suspense> fallback in the category/tag/
 * author route files, which is what actually ends up in the cached/ISR'd
 * HTML), and once inside PaginatedPostGrid's client-rendered branch (so
 * hydration produces identical output for the page-1 case — no visible
 * flash/mismatch).
 */
export function PostGrid({ items, locale, showHero: wantHero, noArticlesLabel }: PostGridProps) {
  if (items.length === 0) {
    return <p className="mt-8 text-ink-muted">{noArticlesLabel}</p>;
  }

  const [featured, ...rest] = items;
  const showHero = wantHero && Boolean(featured);

  return (
    <>
      {showHero && (
        <div className="mt-8 border-b border-border pb-8">
          <ArticleCard post={featured} variant="hero" locale={locale} />
        </div>
      )}
      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {(showHero ? rest : items).map((post) => (
          <ArticleCard key={post.slug} post={post} variant="compact" locale={locale} />
        ))}
      </div>
    </>
  );
}
