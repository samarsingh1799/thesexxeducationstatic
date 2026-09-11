import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTagBySlug } from "@/lib/wordpress/tags";
import { getPosts } from "@/lib/wordpress/posts";
import { getTranslatedPostSummaries } from "@/lib/wordpress/languages";
import { getDictionary } from "@/lib/i18n/dictionary";
import { isSupportedLocale } from "@/lib/i18n/locales";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getTranslationUrls } from "@/lib/seo/canonical";
import { getBreadcrumbSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PaginatedPostGrid } from "@/components/article/PaginatedPostGrid";
import { PostGrid } from "@/components/article/PostGrid";
import { Pagination } from "@/components/ui/Pagination";
import { PaginationNav } from "@/components/ui/PaginationNav";
import { AdSlot } from "@/components/ads/AdSlot";

// On-demand ISR — see app/[locale]/category/[slug]/page.tsx's comment for
// why `searchParams` is never read here (pagination is handled client-side
// by PaginatedPostGrid instead).
export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

const PER_PAGE = 13;

type RouteParams = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale, slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: "Tag not found", robots: { index: false, follow: true } };

  const dictionary = await getDictionary();
  return {
    ...buildPageMetadata({
      title: `#${tag.name}`,
      description: dictionary.articlesTagged.replace("{tag}", tag.name),
      path: `/${locale}/tag/${slug}`,
      translations: getTranslationUrls(`/tag/${slug}`),
    }),
    robots: { index: false, follow: true },
  };
}

export default async function TagPage({ params }: RouteParams) {
  const { locale, slug } = await params;

  if (!isSupportedLocale(locale)) notFound();

  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const [dictionary, { items: englishPosts, totalPages, totalItems }] = await Promise.all([
    getDictionary(),
    getPosts({ tagId: tag.id, page: 1, perPage: PER_PAGE }),
  ]);
  const posts = await getTranslatedPostSummaries(englishPosts, locale);

  const breadcrumbItems = [
    { name: dictionary.home, href: `/${locale}` },
    { name: `#${tag.name}`, href: `/${locale}/tag/${slug}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={getBreadcrumbSchema(breadcrumbItems)} />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 border-b border-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Tag</p>
        <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">#{tag.name}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {totalItems} {totalItems === 1 ? "article" : "articles"}
        </p>
      </div>

      {/* See category/[slug]/page.tsx's comment on why these need a Suspense
          boundary with a real (not null) fallback. */}
      <Suspense fallback={<PostGrid items={posts} locale={locale} showHero noArticlesLabel={dictionary.noArticles} />}>
        <PaginatedPostGrid
          type="tag"
          slug={tag.slug}
          locale={locale}
          initialItems={posts}
          showHeroOnFirstPage
          noArticlesLabel={dictionary.noArticles}
        />
      </Suspense>

      <AdSlot slotId={`tag-${tag.slug}`} label="Advertisement" className="mt-10" />

      <Suspense
        fallback={
          <PaginationNav
            basePath={`/${locale}/tag/${tag.slug}`}
            page={1}
            totalPages={totalPages}
            previousLabel={dictionary.previous}
            nextLabel={dictionary.next}
            pageOfTemplate={dictionary.pageOf}
          />
        }
      >
        <Pagination
          basePath={`/${locale}/tag/${tag.slug}`}
          totalPages={totalPages}
          previousLabel={dictionary.previous}
          nextLabel={dictionary.next}
          pageOfTemplate={dictionary.pageOf}
        />
      </Suspense>
    </div>
  );
}
