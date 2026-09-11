import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getCategoryHierarchy, getDescendantCategoryIds } from "@/lib/wordpress/categories";
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
import type { Category } from "@/types/content";

export const dynamic = "force-dynamic";

const PER_PAGE = 13;

type RouteParams = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false, follow: true } };

  return buildPageMetadata({
    title: category.name,
    description: category.description || `Articles in ${category.name}.`,
    path: `/${locale}/category/${slug}`,
    translations: getTranslationUrls(`/category/${slug}`),
  });
}

export default async function CategoryPage({ params, searchParams }: RouteParams) {
  const { locale, slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  if (!isSupportedLocale(locale)) notFound();

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const hierarchy = await getCategoryHierarchy();
  const categoryIds = getDescendantCategoryIds(category.id, hierarchy);

  const [dictionary, { items: englishPosts, totalPages, totalItems }] = await Promise.all([
    getDictionary(),
    getPosts({ categoryIds, page, perPage: PER_PAGE }),
  ]);

  const posts = await getTranslatedPostSummaries(englishPosts, locale);

  const parent = category.parentId
    ? hierarchy.find((c) => c.id === category.parentId)
    : undefined;
  const children = hierarchy.find((c) => c.id === category.id)?.children ?? [];

  const [featured, ...rest] = posts;

  const breadcrumbItems = [
    { name: dictionary.home, href: `/${locale}` },
    ...(parent ? [{ name: parent.name, href: `/${locale}/category/${parent.slug}` }] : []),
    { name: category.name, href: `/${locale}/category/${slug}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={getBreadcrumbSchema(breadcrumbItems)} />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 border-b border-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Category</p>
        <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">{category.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
          <span>
            {totalItems} {totalItems === 1 ? "article" : "articles"}
          </span>
          {category.description && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span className="max-w-2xl">{category.description}</span>
            </>
          )}
        </div>

        {children.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2.5">
            {children.map((child: Category) => (
              <Link
                key={child.slug}
                href={`/${locale}/category/${child.slug}`}
                className="rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white transition-colors hover:text-accent border border-white/10"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}
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

      <AdSlot slotId={`category-${category.slug}`} label="Advertisement" className="mt-10" />

      <Pagination basePath={`/${locale}/category/${category.slug}`} page={page} totalPages={totalPages} locale={locale} />
    </div>
  );
}
