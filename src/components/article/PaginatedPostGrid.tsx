"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PostSummary } from "@/types/content";
import { PostGrid } from "./PostGrid";

type ListingType = "category" | "tag" | "author" | "latest";

type PaginatedPostGridProps = {
  type: ListingType;
  /** Not used for "latest" (every published post, unfiltered — no slug to scope by). */
  slug?: string;
  locale: string;
  /** Page 1, already translated — used directly (no fetch) whenever the resolved page is 1. */
  initialItems: PostSummary[];
  /** Category/tag pages give page 1's first post a hero treatment; author pages don't. */
  showHeroOnFirstPage: boolean;
  noArticlesLabel: string;
};

/**
 * Client-side pagination for category/tag/author listings — reads the
 * current page from the URL via `useSearchParams()`, which is exactly why
 * this must always be rendered inside a <Suspense> boundary in the parent
 * route file, with a fallback that renders the real page-1 grid directly
 * (via the same PostGrid component, called with server-known data, no
 * client dependency at all). That fallback is what actually ends up in the
 * cached/ISR'd HTML — this component only ever runs after hydration, in
 * the browser. For the overwhelmingly common page-1 case it renders
 * identical markup to that fallback (no visible flash); for `?page=N`
 * (N>1) it fetches that page from /api/listings and swaps in the real
 * content — see PaginatedPostGrid's sibling, the route files in
 * app/[locale]/{category,tag,author}/[slug]/page.tsx, for why those pages
 * no longer read `searchParams` server-side at all (doing so would force
 * per-request dynamic rendering and defeat ISR caching, per Next's own
 * docs).
 *
 * The trade-off, disclosed rather than hidden: a direct/bookmarked/crawled
 * `?page=2` URL's initial HTML is the page-1 fallback until this component
 * hydrates and fetches the real page, a moment later. Acceptable here
 * because canonical (lib/seo/canonical.ts) already points every paginated
 * URL at the page-1 URL regardless of which page is being viewed.
 */
export function PaginatedPostGrid({
  type,
  slug,
  locale,
  initialItems,
  showHeroOnFirstPage,
  noArticlesLabel,
}: PaginatedPostGridProps) {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  // Only ever holds the result of a page>1 fetch — page 1 needs no state at
  // all, since it renders straight from `initialItems` on every render.
  const [fetched, setFetched] = useState<{ page: number; items: PostSummary[] } | null>(null);

  useEffect(() => {
    if (page === 1) return;

    let cancelled = false;

    (async () => {
      try {
        const slugParam = slug ? `&slug=${encodeURIComponent(slug)}` : "";
        const res = await fetch(`/api/listings?type=${type}${slugParam}&locale=${locale}&page=${page}`);
        const data = (res.ok ? await res.json() : { items: [] }) as { items?: PostSummary[] };
        if (!cancelled) setFetched({ page, items: data.items ?? [] });
      } catch {
        if (!cancelled) setFetched({ page, items: [] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, type, slug, locale]);

  if (page !== 1 && fetched?.page !== page) {
    return (
      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  const items = page === 1 ? initialItems : fetched!.items;

  return <PostGrid items={items} locale={locale} showHero={showHeroOnFirstPage && page === 1} noArticlesLabel={noArticlesLabel} />;
}
