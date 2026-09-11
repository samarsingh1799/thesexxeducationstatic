import Link from "next/link";
import Image from "next/image";
import type { PostSummary, Category, CategoryWithChildren } from "@/types/content";
import { PostCardImage } from "@/components/images/PostCardImage";
import { getArticlePath } from "@/lib/seo/canonical";

type CategoryShowcaseProps = {
  category: CategoryWithChildren | Category;
  posts: PostSummary[];
  allCategories?: (CategoryWithChildren | Category)[];
  locale: string;
};

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function BentoCard({ post, locale }: { post: PostSummary; locale: string }) {
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
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        <span aria-hidden="true">&bull;</span>
        <span>{post.author.name}</span>
      </div>
      <h3 className="mt-1.5 text-xl sm:text-2xl font-normal leading-snug text-ink group-hover:underline">
        {post.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">
        {post.excerpt}
      </p>
    </Link>
  );
}

export function BentoFeatureCard({ post, locale }: { post: PostSummary; locale: string }) {
  const href = getArticlePath(locale, post.category?.slug, post.slug);
  return (
    <Link
      href={href}
      className="group relative flex min-h-[360px] sm:min-h-[400px] flex-col justify-end overflow-hidden rounded-2xl bg-ink p-6"
    >
      {post.featuredImage && (
        <Image
          src={post.featuredImage.url}
          alt={post.featuredImage.alt || post.title}
          fill
          className="object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-xs text-white/80">
          <span>{post.author.name}</span>
          <span aria-hidden="true">&bull;</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </div>
        <h3 className="mt-1.5 text-xl sm:text-2xl font-normal leading-snug text-white group-hover:underline">
          {post.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/80">
          {post.excerpt}
        </p>
      </div>
    </Link>
  );
}

export function CategoryShowcase({
  category,
  posts,
  allCategories = [],
  locale,
}: CategoryShowcaseProps) {
  if (posts.length === 0) return null;

  const children = "children" in category && category.children ? category.children : [];
  const topicList: Category[] =
    children.length > 0
      ? children
      : allCategories.filter((c) => c.slug !== category.slug);

  const leftCount = Math.ceil(posts.length / 2);
  const leftColumn = posts.slice(0, leftCount);
  const rightColumn = posts.slice(leftCount);
  const lastIndex = posts.length - 1;

  function renderTile(post: PostSummary, globalIndex: number) {
    return globalIndex === lastIndex ? (
      <BentoFeatureCard key={post.slug} post={post} locale={locale} />
    ) : (
      <BentoCard key={post.slug} post={post} locale={locale} />
    );
  }

  return (
    <section aria-labelledby={`category-${category.slug}-heading`} className="mt-12">
      {/* Continuous Horizontal Dividing Line with Hanging Badge */}
      <div className="border-t border-border">
        <div className="inline-block rounded-b-md bg-[#171717] px-5 py-1 shadow-sm">
          <span className="text-[11px] font-bold tracking-[0.25em] text-white uppercase">
            BROWSE BY TOPIC
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        {/* Left Topic Sidebar Column */}
        <div className="lg:col-span-3 pr-0 lg:pr-6">
          <h2
            id={`category-${category.slug}-heading`}
            className="text-3xl sm:text-4xl font-normal leading-[1.15] text-ink"
          >
            {category.name}
          </h2>

          {topicList.length > 0 && (
            <div className="mt-3 flex flex-col divide-y divide-border">
              {topicList.slice(0, 8).map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/${locale}/category/${topic.slug}`}
                  className="py-3.5 text-xl sm:text-xl text-ink-muted/70 transition-colors hover:text-ink"
                >
                  {topic.name}
                </Link>
              ))}
            </div>
          )}

          <Link
            href={`/${locale}/category/${category.slug}`}
            className="mt-8 inline-block rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800"
          >
            View Directory
          </Link>
        </div>

        {/* Right Post Grid (2 Columns) */}
        <div className="lg:col-span-9 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-8">
            {leftColumn.map((post, i) => renderTile(post, i))}
          </div>

          {rightColumn.length > 0 && (
            <div className="flex flex-col gap-8">
              {rightColumn.map((post, i) => renderTile(post, leftCount + i))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
