import Link from "next/link";
import type { PostSummary } from "@/types/content";
import { getArticlePath } from "@/lib/seo/canonical";
import { ArticleMeta } from "./ArticleMeta";
import { PostCardImage } from "@/components/images/PostCardImage";

type ArticleCardVariant = "banner" | "hero" | "featured" | "split" | "compact" | "list";

type ArticleCardProps = {
  post: PostSummary;
  locale: string;
  variant?: ArticleCardVariant;
  /** `banner` variant only — set on at most one visible-on-load card per page (e.g. slide 0 of a slider), never on every instance, or every image competes for LCP priority. */
  priority?: boolean;
};

function formatBannerDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function ArticleCard({ post, locale, variant = "compact", priority = false }: ArticleCardProps) {
  const href = getArticlePath(locale, post.category?.slug, post.slug);
  const categoryName = post.category?.name;

  if (variant === "list") {
    return (
      <li className="flex items-start justify-between gap-4 border-b border-border py-4 first:pt-0 last:border-b-0">
        <div className="min-w-0">
          {categoryName && (
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {categoryName}
            </p>
          )}
          <h3 className="mt-1 font-semibold leading-snug text-ink">
            <Link href={href} className="hover:underline">
              {post.title}
            </Link>
          </h3>
          <div className="mt-1">
            <ArticleMeta author={post.author} publishedAt={post.publishedAt} size="compact" locale={locale} />
          </div>
        </div>
        {post.featuredImage && (
          <Link
            href={href}
            className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:block"
          >
            <PostCardImage image={post.featuredImage} fit="contain" />
          </Link>
        )}
      </li>
    );
  }

  if (variant === "banner") {
    const bannerCategoryName = categoryName || "Articles";
    const publishedDate = formatBannerDate(post.publishedAt);

    return (
      <article className="relative overflow-hidden rounded-2xl bg-surface-inverse">
        <Link href={href} className="group block">
          <div className="relative w-full bg-gray-100">
            {post.featuredImage && (
              <PostCardImage
                image={post.featuredImage}
                isLcp={priority}
                className="opacity-95 transition-transform duration-500 group-hover:scale-105"
              />
            )}
            {/* Top and bottom gradient vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />

            {/* Top Header: Real category and published date with high-contrast pills */}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-6 z-10">
              <span className="inline-flex items-center rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] sm:text-xs sm:px-3.5 sm:py-1 font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20 shadow-md">
                {bannerCategoryName}
              </span>
              <span className="inline-flex items-center rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] sm:text-xs sm:px-3.5 sm:py-1 font-semibold text-white/95 backdrop-blur-md border border-white/20 shadow-md">
                {publishedDate}
              </span>
            </div>

            {/* Bottom Title */}
            <h2 className="absolute inset-x-0 bottom-0 p-3.5 sm:p-6 text-lg font-bold leading-snug text-white drop-shadow-md sm:text-3xl md:text-4xl lg:text-5xl sm:leading-tight group-hover:underline">
              {post.title}
            </h2>
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "split") {
    return (
      <article className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {post.featuredImage && (
          <Link href={href} className="block overflow-hidden rounded-xl bg-gray-100">
            <PostCardImage image={post.featuredImage} />
          </Link>
        )}
        <div className="flex flex-col justify-center">
          {categoryName && (
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {categoryName}
            </p>
          )}
          <h3 className="mt-2 text-2xl font-bold leading-tight text-ink">
            <Link href={href} className="hover:underline">
              {post.title}
            </Link>
          </h3>
          <p className="mt-2 text-ink-muted">{post.excerpt}</p>
          <Link
            href={href}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-dark hover:underline"
          >
            Read now →
          </Link>
        </div>
      </article>
    );
  }

  if (variant === "hero") {
    return (
      <article className="group grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
        {post.featuredImage && (
          <Link href={href} className="block overflow-hidden rounded-xl bg-gray-100">
            <PostCardImage image={post.featuredImage} />
          </Link>
        )}
        <div>
          {categoryName && (
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              {categoryName}
            </p>
          )}
          <h2 className="mt-2 text-2xl font-bold leading-tight text-ink md:text-3xl">
            <Link href={href} className="group-hover:underline">
              {post.title}
            </Link>
          </h2>
          <p className="mt-2 max-w-[60ch] text-ink-muted">{post.excerpt}</p>
          <div className="mt-3">
            <ArticleMeta author={post.author} publishedAt={post.publishedAt} locale={locale} />
          </div>
        </div>
      </article>
    );
  }

  if (variant === "featured") {
    return (
      <article className="flex gap-4">
        {post.featuredImage && (
          <Link
            href={href}
            className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-24 sm:w-32"
          >
            <PostCardImage image={post.featuredImage} fit="contain" />
          </Link>
        )}
        <div className="min-w-0">
          {categoryName && (
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {categoryName}
            </p>
          )}
          <h3 className="mt-1 font-semibold leading-snug text-ink">
            <Link href={href} className="hover:underline">
              {post.title}
            </Link>
          </h3>
          <div className="mt-1">
            <ArticleMeta author={post.author} publishedAt={post.publishedAt} size="compact" locale={locale} />
          </div>
        </div>
      </article>
    );
  }

  // compact — the standard grid card used on category/tag/author/search/related.
  return (
    <article className="group">
      <Link href={href} className="block">
        {post.featuredImage && (
          <div className="overflow-hidden rounded-xl bg-gray-100">
            <PostCardImage image={post.featuredImage} className="transition-transform group-hover:scale-[1.03]" />
          </div>
        )}
        {categoryName && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent">
            {categoryName}
          </p>
        )}
        <h3 className="mt-2 text-lg font-semibold leading-snug text-ink group-hover:underline">
          {post.title}
        </h3>
      </Link>
      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{post.excerpt}</p>
      <div className="mt-2">
        <ArticleMeta author={post.author} publishedAt={post.publishedAt} size="compact" locale={locale} />
      </div>
    </article>
  );
}
