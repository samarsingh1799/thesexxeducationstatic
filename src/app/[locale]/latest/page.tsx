import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
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

// Same archive pattern as category/[slug]/page.tsx (breadcrumb, hero + grid,
// pagination), just without a category filter — every published post,
// reverse-chronological. On-demand ISR: page 1 is rendered and cached at
// the edge, invalidated only by the WordPress webhook (`postsList`/
// `sitemap` tags cover it — see lib/wordpress/posts.ts#getPosts and
// api/revalidate/route.ts). `searchParams` is deliberately never read
// here — pagination beyond page 1 is handled client-side by
// PaginatedPostGrid, exactly like category/tag/author.
export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

const PER_PAGE = 13;

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary();
  return buildPageMetadata({
    title: dictionary.latestTitle,
    description: dictionary.latestDescription,
    path: `/${locale}/latest`,
    translations: getTranslationUrls("/latest"),
  });
}

export default async function LatestPage({ params }: RouteParams) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const [dictionary, { items: englishPosts, totalPages }] = await Promise.all([
    getDictionary(),
    getPosts({ page: 1, perPage: PER_PAGE }),
  ]);
  const posts = await getTranslatedPostSummaries(englishPosts, locale);

  const breadcrumbItems = [
    { name: dictionary.home, href: `/${locale}` },
    { name: dictionary.latestBreadcrumb, href: `/${locale}/latest` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={getBreadcrumbSchema(breadcrumbItems)} />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 border-b border-border pb-8">
        <h1 className="text-3xl font-bold text-ink md:text-4xl">{dictionary.latestTitle}</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">{dictionary.latestDescription}</p>
      </div>

      {/* See category/[slug]/page.tsx's comment on why these need a Suspense
          boundary with a real (not null) fallback. */}
      <Suspense fallback={<PostGrid items={posts} locale={locale} showHero noArticlesLabel={dictionary.noArticles} />}>
        <PaginatedPostGrid
          type="latest"
          locale={locale}
          initialItems={posts}
          showHeroOnFirstPage
          noArticlesLabel={dictionary.noArticles}
        />
      </Suspense>

      <AdSlot slotId="latest" label="Advertisement" className="mt-10" />

      <Suspense
        fallback={
          <PaginationNav
            basePath={`/${locale}/latest`}
            page={1}
            totalPages={totalPages}
            previousLabel={dictionary.previous}
            nextLabel={dictionary.next}
            pageOfTemplate={dictionary.pageOf}
          />
        }
      >
        <Pagination
          basePath={`/${locale}/latest`}
          totalPages={totalPages}
          previousLabel={dictionary.previous}
          nextLabel={dictionary.next}
          pageOfTemplate={dictionary.pageOf}
        />
      </Suspense>
    </div>
  );
}
