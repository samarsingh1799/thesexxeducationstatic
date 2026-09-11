import Link from "next/link";
import type { PostSummary } from "@/types/content";
import { PostCardImage } from "@/components/images/PostCardImage";
import { TrendingArticleList } from "@/components/article/TrendingSidebar";
import { AdSlot } from "@/components/ads/AdSlot";
import { getArticlePath } from "@/lib/seo/canonical";

type CurrentAndTrendingProps = {
  current: PostSummary[];
  trending: PostSummary[];
  locale: string;
};

function CurrentArticleCard({ post, locale }: { post: PostSummary; locale: string }) {
  const href = getArticlePath(locale, post.category?.slug, post.slug);

  return (
    <Link href={href} className="group block">
      {post.featuredImage && (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gray-100">
          <PostCardImage
            image={post.featuredImage}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        {post.category && <span className="truncate font-semibold">{post.category.name}</span>}
        {post.category && post.author?.name && <span className="text-gray-400">/</span>}
        {post.author?.name && <span className="truncate">{post.author.name}</span>}
      </div>
      <h3 className="mt-1.5 text-lg font-bold leading-snug text-ink line-clamp-2 group-hover:underline">
        {post.title}
      </h3>
      {post.excerpt && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
          {post.excerpt}
        </p>
      )}
    </Link>
  );
}

export function CurrentAndTrending({ current, trending, locale }: CurrentAndTrendingProps) {
  if (current.length === 0 && trending.length === 0) return null;

  return (
    <section aria-labelledby="current-heading" className="mt-12">
      {/* Continuous Horizontal Dividing Line */}
      <div className="border-t border-border" />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left Column: Current */}
        <div className="lg:col-span-8">
          <div className="flex items-start justify-between">
            <div className="inline-block rounded-b-md bg-[#171717] px-5 py-1 shadow-sm">
              <span
                id="current-heading"
                className="text-[11px] font-bold tracking-[0.25em] text-white uppercase"
              >
                CURRENT
              </span>
            </div>
            <Link
              href={`/${locale}/latest`}
              className="pt-2 text-sm font-semibold text-accent hover:text-accent transition-colors"
            >
              See all →
            </Link>
          </div>

          {current.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
              {current.map((post) => (
                <CurrentArticleCard key={post.slug} post={post} locale={locale} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Trending */}
        {trending.length > 0 && (
          <aside className="lg:col-span-4">
            <div className="inline-block rounded-b-md bg-[#171717] px-5 py-1 shadow-sm">
              <span
                id="trending-heading"
                className="text-[11px] font-bold tracking-[0.25em] text-white uppercase"
              >
                TRENDING
              </span>
            </div>
            <div className="mt-6">
              <TrendingArticleList posts={trending} headingId="trending-heading" locale={locale} />
            </div>

            <div className="sticky top-32 mt-6">
              <AdSlot
                slotId="home-trending"
                label="Advertisement · Continue Reading Below"
                minHeight={250}
              />
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
