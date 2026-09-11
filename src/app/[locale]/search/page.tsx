import type { Metadata } from "next";
import { getPosts } from "@/lib/wordpress/posts";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ArticleCard } from "@/components/article/ArticleCard";

/**
 * v1 search: proxies WordPress's own `?search=` REST param — good enough
 * at this project's scale, and avoids loading the whole post catalog
 * into the browser. If traffic/content volume grows, this is the one
 * place to swap in a dedicated search engine (e.g. an Algolia/Meilisearch
 * index kept in sync via the same revalidation webhook) without
 * touching any other page.
 */
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ params, searchParams }: RouteParams) {
  const { locale } = await params;
  const { q } = await searchParams;
  const dictionary = await getDictionary();

  const { items } = q ? await getPosts({ search: q, perPage: 20 }) : { items: [] };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <form className="max-w-md">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search articles…"
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </form>

      {q && (
        <div className="mt-8">
          {items.length === 0 ? (
            <p className="text-ink-muted">{dictionary.noArticles}</p>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((post) => (
                <ArticleCard key={post.slug} post={post} locale={locale} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
