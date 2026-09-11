import type { Metadata } from "next";
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
import { ArticleCard } from "@/components/article/ArticleCard";
import { Pagination } from "@/components/ui/Pagination";
import { AdSlot } from "@/components/ads/AdSlot";

export const dynamic = "force-dynamic";

const PER_PAGE = 13;

type RouteParams = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale, slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: "Tag not found", robots: { index: false, follow: true } };

  return {
    ...buildPageMetadata({
      title: `#${tag.name}`,
      description: `Articles tagged ${tag.name}.`,
      path: `/${locale}/tag/${slug}`,
      translations: getTranslationUrls(`/tag/${slug}`),
    }),
    robots: { index: false, follow: true },
  };
}

export default async function TagPage({ params, searchParams }: RouteParams) {
  const { locale, slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  if (!isSupportedLocale(locale)) notFound();

  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const [dictionary, { items: englishPosts, totalPages, totalItems }] = await Promise.all([
    getDictionary(),
    getPosts({ tagId: tag.id, page, perPage: PER_PAGE }),
  ]);
  const posts = await getTranslatedPostSummaries(englishPosts, locale);

  const [featured, ...rest] = posts;

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

      {posts.length === 0 ? (
        <p className="mt-8 text-ink-muted">{dictionary.noArticles}</p>
      ) : (
        <>
          {page === 1 && featured && (
            <div className="mt-8 border-b border-border pb-8">
              <ArticleCard post={featured} variant="hero" locale={locale} />
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {(page === 1 ? rest : posts).map((post) => (
              <ArticleCard key={post.slug} post={post} variant="compact" locale={locale} />
            ))}
          </div>
        </>
      )}

      <AdSlot slotId={`tag-${tag.slug}`} label="Advertisement" className="mt-10" />

      <Pagination basePath={`/${locale}/tag/${tag.slug}`} page={page} totalPages={totalPages} locale={locale} />
    </div>
  );
}
