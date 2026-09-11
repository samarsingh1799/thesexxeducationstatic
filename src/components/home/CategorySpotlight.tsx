import Link from "next/link";
import Image from "next/image";
import type { PostSummary, Category, CategoryWithChildren } from "@/types/content";
import { BentoCard, BentoFeatureCard, formatDate } from "@/components/home/CategoryShowcase";
import { PostCardImage } from "@/components/images/PostCardImage";
import { AdSlot } from "@/components/ads/AdSlot";
import { getArticlePath } from "@/lib/seo/canonical";

type CategorySpotlightProps = {
  category: CategoryWithChildren | Category;
  posts: PostSummary[];
  locale: string;
};

function SpotlightCard({ post, locale }: { post: PostSummary; locale: string }) {
  const href = getArticlePath(locale, post.category?.slug, post.slug);
  const postCategoryName = post.category?.name;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        {post.author?.name && (
          <>
            <span aria-hidden="true">&bull;</span>
            <span>{post.author.name}</span>
          </>
        )}
      </div>

      <h3 className="mt-2 text-xl sm:text-2xl font-normal leading-snug text-ink">
        <Link href={href} className="hover:underline">
          {post.title}
        </Link>
      </h3>

      {post.excerpt && (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{post.excerpt}</p>
      )}

      {post.featuredImage && (
        <Link
          href={href}
          className="relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-xl bg-gray-100 block"
        >
          <PostCardImage
            image={post.featuredImage}
            className="h-full w-full object-cover"
            sizes="(max-width: 1024px) 100vw, 25vw"
          />
        </Link>
      )}

      {post.author && (
        <Link
          href={`/${locale}/author/${post.author.slug}`}
          className="mt-6 flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100"
        >
          {post.author.avatarUrl ? (
            <Image
              src={post.author.avatarUrl}
              alt={post.author.name}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-dark">
              {post.author.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{post.author.name}</span>
            {postCategoryName && (
              <span className="block truncate text-xs text-ink-muted">
                Writes about {postCategoryName}
              </span>
            )}
          </span>
          <span aria-hidden="true" className="shrink-0 text-ink-muted">
            &rsaquo;
          </span>
        </Link>
      )}

      <p className="mt-4 text-sm font-semibold text-ink">
        <Link href={href} className="hover:text-accent hover:underline">
          Read the full story →
        </Link>
      </p>
    </div>
  );
}

export function CategorySpotlight({ category, posts, locale }: CategorySpotlightProps) {
  if (posts.length === 0) return null;

  const spotlightPost = posts[posts.length - 1];
  const remaining = posts.slice(0, -1);
  const leftCount = Math.ceil(remaining.length / 2);
  const leftColumn = remaining.slice(0, leftCount);
  const rightColumn = remaining.slice(leftCount);
  const lastRemainingIndex = remaining.length - 1;

  function renderTile(post: PostSummary, globalIndex: number) {
    return globalIndex === lastRemainingIndex ? (
      <BentoFeatureCard key={post.slug} post={post} locale={locale} />
    ) : (
      <BentoCard key={post.slug} post={post} locale={locale} />
    );
  }

  return (
    <section aria-labelledby={`spotlight-${category.slug}-heading`} className="mt-12">
      {/* Continuous Horizontal Dividing Line with Hanging Badge */}
      <div className="border-t border-border">
        <div className="inline-block rounded-b-md bg-[#171717] px-5 py-1 shadow-sm">
          <span className="text-[11px] font-bold tracking-[0.25em] text-white uppercase">
            WEEKLY HIGHLIGHTS
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id={`spotlight-${category.slug}-heading`}
            className="text-3xl sm:text-4xl leading-[1.15] text-ink"
          >
            Inside {category.name}
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-ink-muted sm:text-right">
          {category.description || `Our most-read stories on ${category.name}, hand-picked by our editors.`}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {leftColumn.length > 0 && (
          <div className="flex flex-col gap-8">
            {leftColumn.map((post, i) => renderTile(post, i))}
          </div>
        )}
        {rightColumn.length > 0 && (
          <div className="flex flex-col gap-8">
            {rightColumn.map((post, i) => renderTile(post, leftCount + i))}
          </div>
        )}
        <SpotlightCard post={spotlightPost} locale={locale} />
      </div>

      <AdSlot
        slotId="home-spotlight"
        label="Advertisement · Continue Reading Below"
        minHeight={250}
        className="mt-10"
      />
    </section>
  );
}
