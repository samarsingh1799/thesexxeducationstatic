import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { getTranslatedPost, getAvailableTranslationLocales, getTranslatedPostSummaries } from "@/lib/wordpress/languages";
import { getRelatedPosts } from "@/lib/wordpress/posts";
import { getTrendingPosts } from "@/lib/wordpress/trending";
import { getDictionary } from "@/lib/i18n/dictionary";
import { isSupportedLocale, defaultLocale } from "@/lib/i18n/locales";
import { getArticlePath, getArticleTranslationUrls, getCanonicalUrl } from "@/lib/seo/canonical";
import { buildArticleMetadata } from "@/lib/seo/metadata";
import { getArticleSchema, getBreadcrumbSchema } from "@/lib/seo/schema";
import { estimateReadingMinutes } from "@/lib/content/reading-time";
import { buildTableOfContents } from "@/lib/content/toc";
import { splitSections } from "@/lib/content/splitSections";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ArticleBody } from "@/components/article/ArticleBody";
import { ArticleColumns } from "@/components/article/ArticleColumns";
import { ArticleCard } from "@/components/article/ArticleCard";
import { ArticleMeta } from "@/components/article/ArticleMeta";
import { AuthorBio } from "@/components/article/AuthorBio";
import { TableOfContents } from "@/components/article/TableOfContents";
import { TranslationNotice } from "@/components/article/TranslationNotice";
import { TrendingSidebar } from "@/components/article/TrendingSidebar";
import { ViewTracker } from "@/components/article/ViewTracker";
import { SaveArticleButton } from "@/components/article/SaveArticleButton";
import { LikeArticleButton } from "@/components/article/LikeArticleButton";
import { ShareButtons } from "@/components/article/ShareButtons";
import { FontSizeControl } from "@/components/article/FontSizeControl";
import { AdSlot } from "@/components/ads/AdSlot";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

type RouteParams = { params: Promise<{ locale: string; category: string; slug: string }> };

const loadPost = cache(async (locale: string, slug: string) => getTranslatedPost(locale, slug));

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) return {};

  const post = await loadPost(locale, slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: true } };

  const availableLocales = await getAvailableTranslationLocales(post.id);
  const path = getArticlePath(locale, post.category?.slug, post.slug);
  return buildArticleMetadata(post, path, getArticleTranslationUrls(post.category?.slug, post.slug, availableLocales));
}

export default async function ArticlePage({ params }: RouteParams) {
  const { locale, category, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const post = await loadPost(locale, slug);
  if (!post) notFound();

  const canonicalPath = getArticlePath(locale, post.category?.slug, post.slug);
  if (`/${category}` !== `/${post.category?.slug ?? "article"}`) {
    permanentRedirect(canonicalPath);
  }

  const canonicalUrl = getCanonicalUrl(canonicalPath);
  const [dictionary, relatedPostsPool, trendingPostsPool] = await Promise.all([
    getDictionary(),
    getRelatedPosts(post),
    getTrendingPosts(5, [post.id]),
  ]);

  const [relatedPosts, trendingPosts] = await Promise.all([
    getTranslatedPostSummaries(relatedPostsPool, locale),
    getTranslatedPostSummaries(trendingPostsPool, locale),
  ]);

  const breadcrumbItems = [
    { name: dictionary.home, href: `/${locale}` },
    ...(post.category ? [{ name: post.category.name, href: `/${locale}/category/${post.category.slug}` }] : []),
    { name: post.title, href: canonicalPath },
  ];

  const localeConfig = isSupportedLocale(locale) ? locale : defaultLocale;
  const breadcrumbSchema = getBreadcrumbSchema(breadcrumbItems);
  const articleSchema = getArticleSchema(post, canonicalPath, localeConfig);
  const readingMinutes = estimateReadingMinutes(post.contentHtml);
  const { html, headings } = buildTableOfContents(post.contentHtml);
  const sections = splitSections(html);
  const isTranslated = locale !== defaultLocale;
  const originalUrl = isTranslated ? getCanonicalUrl(getArticlePath(defaultLocale, post.category?.slug, post.slug)) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={[articleSchema, breadcrumbSchema]} />
      <ViewTracker postId={post.id} />
      <Breadcrumbs items={breadcrumbItems} />

      {/* Main 2-column grid layout with sticky sidebar */}
      <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <article className="lg:col-span-8 min-w-0">
          <header className="mb-8">
            {post.category && (
              <Link
                href={`/${locale}/category/${post.category.slug}`}
                className="text-sm font-semibold uppercase tracking-wide text-accent hover:text-accent-dark hover:underline"
              >
                {post.category.name}
              </Link>
            )}
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
              {post.title}
            </h1>
            {post.excerpt && <p className="mt-3 text-lg text-ink-muted">{post.excerpt}</p>}
            <div className="mt-4">
              <ArticleMeta
                author={post.author}
                publishedAt={post.publishedAt}
                modifiedAt={post.modifiedAt}
                readingMinutes={readingMinutes}
                locale={locale}
              />
            </div>
          </header>

          {isTranslated && originalUrl && (
            <div className="mt-6">
              <TranslationNotice originalUrl={originalUrl} />
            </div>
          )}

          <div className="mb-8 flex items-center justify-end gap-2">
            <LikeArticleButton postId={post.id} slug={post.slug} categorySlug={post.category?.slug} locale={locale} title={post.title} />
            <SaveArticleButton postId={post.id} slug={post.slug} categorySlug={post.category?.slug} locale={locale} title={post.title} />
            <FontSizeControl />
            <ShareButtons url={canonicalUrl} title={post.title} />
          </div>

          {post.featuredImage && (
            <figure className="mb-8">
              <Image
                src={post.featuredImage.url}
                alt={post.featuredImage.alt}
                width={post.featuredImage.width ?? 1200}
                height={post.featuredImage.height ?? 675}
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="h-auto w-full rounded-xl"
              />
            </figure>
          )}

          <TableOfContents headings={headings} className="mb-8" />
          
          {sections ? (
            <ArticleColumns introHtml={sections.introHtml} sections={sections.sections} />
          ) : (
            <ArticleBody html={html} />
          )}

          {post.tags.length > 0 && (
            <section aria-labelledby="topics-heading" className="mt-12">
              <div className="border-t border-border">
                <div className="inline-block rounded-b-md bg-[#171717] px-5 py-1 shadow-sm">
                  <span id="topics-heading" className="text-[11px] font-bold tracking-[0.25em] text-white uppercase">
                    TOPICS
                  </span>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/${locale}/tag/${tag.slug}`}
                    className="rounded-md bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-accent"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <AdSlot slotId="article-in-body" label="Advertisement" minHeight={250} className="mt-10" />

          <section aria-labelledby="author-heading" className="mt-12">
            <div className="border-t border-border">
              <div className="inline-block rounded-b-md bg-[#171717] px-5 py-1 shadow-sm">
                <span id="author-heading" className="text-[11px] font-bold tracking-[0.25em] text-white uppercase">
                  AUTHOR
                </span>
              </div>
            </div>
            <div className="mt-6">
              <AuthorBio author={post.author} locale={locale} />
            </div>
          </section>
        </article>

        {/* Right column: Sticky Trending Sidebar */}
        <aside className="lg:col-span-4 w-full">
          <div className="sticky top-32">
            <TrendingSidebar posts={trendingPosts} locale={locale} />
          </div>
        </aside>
      </div>

      {relatedPosts.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16 border-t border-border pt-8">
          <h2 id="related-heading" className="text-lg font-bold text-ink">
            {dictionary.relatedArticles}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {relatedPosts.map((related) => (
              <ArticleCard key={related.slug} post={related} variant="compact" locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
