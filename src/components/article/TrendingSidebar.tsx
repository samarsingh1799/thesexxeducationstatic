import Image from "next/image";
import Link from "next/link";
import { AdSlot } from "@/components/ads/AdSlot";
import { getArticlePath } from "@/lib/seo/canonical";
import type { PostSummary } from "@/types/content";

type TrendingSidebarProps = {
  posts: PostSummary[];
  locale: string;
};

export function TrendingArticleList({
  posts,
  headingId,
  locale,
}: {
  posts: PostSummary[];
  headingId?: string;
  locale: string;
}) {
  if (posts.length === 0) return null;

  return (
    <div aria-labelledby={headingId} className="flex flex-col divide-y divide-border">
      {posts.map((item) => {
        const href = getArticlePath(locale, item.category?.slug, item.slug);
        return (
          <article key={item.id || item.slug} className="group py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-4">
              <Link
                href={href}
                className="relative h-22 w-32 shrink-0 overflow-hidden rounded-md bg-gray-100"
              >
                {item.featuredImage ? (
                  <Image
                    src={item.featuredImage.url}
                    alt={item.featuredImage.alt || item.title}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    sizes="128px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-accent-soft text-accent-dark font-bold text-xs">
                    {item.category?.name?.slice(0, 2).toUpperCase() || "ART"}
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  {item.category && (
                    <Link
                      href={`/${locale}/category/${item.category.slug}`}
                      className="truncate hover:text-accent font-semibold"
                    >
                      {item.category.name}
                    </Link>
                  )}
                  {item.category && item.author?.name && (
                    <span className="text-gray-400">/</span>
                  )}
                  {item.author?.name && (
                    <span className="truncate">{item.author.name}</span>
                  )}
                </div>

                <h3 className="mt-1 text-base font-bold leading-snug text-ink group-hover:text-accent group-hover:underline line-clamp-3">
                  <Link href={href}>
                    {item.title}
                  </Link>
                </h3>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function TrendingSidebar({ posts, locale }: TrendingSidebarProps) {
  return (
    <div className="space-y-8">
      <aside aria-label="Advertisement" className="w-full">
        <AdSlot
          slotId="article-sidebar-top-ad"
          minHeight={250}
          className="w-full overflow-hidden rounded-xl border border-border bg-gray-50/50 p-2 text-center"
          label="Advertisement"
        />
      </aside>

      {posts.length > 0 && (
        <section aria-labelledby="trending-heading" className="w-full">
          <div className="border-t border-border">
            <div className="inline-block rounded-b-md bg-[#171717] px-5 py-1 shadow-sm">
              <span
                id="trending-heading"
                className="text-[11px] font-bold tracking-[0.25em] text-white uppercase"
              >
                TRENDING
              </span>
            </div>
          </div>

          <div className="mt-4">
            <TrendingArticleList posts={posts} headingId="trending-heading" locale={locale} />
          </div>
        </section>
      )}
    </div>
  );
}
