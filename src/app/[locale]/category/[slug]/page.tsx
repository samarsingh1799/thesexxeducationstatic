import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getCategoryHierarchy, getDescendantCategoryIds } from "@/lib/wordpress/categories";
import { getPosts } from "@/lib/wordpress/posts";
import { getTranslatedPostSummaries } from "@/lib/wordpress/languages";
import { getDictionary } from "@/lib/i18n/dictionary";
import { isSupportedLocale } from "@/lib/i18n/locales";
import { localizeCategoryName } from "@/lib/i18n/categoryNames";
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
import type { Category } from "@/types/content";

// On-demand ISR, matching home/article (see those routes' comments): page 1
// is rendered and cached at the edge, invalidated only by the WordPress
// webhook. `searchParams` (pagination) is deliberately never read here —
// doing so would force this whole route to render dynamically on every
// request regardless of this config, per Next's own docs. Pagination
// beyond page 1 is handled client-side by PaginatedPostGrid instead.
export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

const PER_PAGE = 13;

type RouteParams = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false, follow: true } };

  const dictionary = await getDictionary();
  const categoryName = localizeCategoryName(category, dictionary);
  return buildPageMetadata({
    title: categoryName,
    description: category.description || dictionary.articlesInCategory.replace("{category}", categoryName),
    path: `/${locale}/category/${slug}`,
    translations: getTranslationUrls(`/category/${slug}`),
  });
}

export default async function CategoryPage({ params }: RouteParams) {
  const { locale, slug } = await params;

  if (!isSupportedLocale(locale)) notFound();

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const hierarchy = await getCategoryHierarchy();
  const categoryIds = getDescendantCategoryIds(category.id, hierarchy);

  const [dictionary, { items: englishPosts, totalPages, totalItems }] = await Promise.all([
    getDictionary(),
    getPosts({ categoryIds, page: 1, perPage: PER_PAGE }),
  ]);

  const posts = await getTranslatedPostSummaries(englishPosts, locale);

  const parent = category.parentId
    ? hierarchy.find((c) => c.id === category.parentId)
    : undefined;
  const children = hierarchy.find((c) => c.id === category.id)?.children ?? [];

  const categoryName = localizeCategoryName(category, dictionary);
  const parentName = parent ? localizeCategoryName(parent, dictionary) : undefined;

  const breadcrumbItems = [
    { name: dictionary.home, href: `/${locale}` },
    ...(parent ? [{ name: parentName!, href: `/${locale}/category/${parent.slug}` }] : []),
    { name: categoryName, href: `/${locale}/category/${slug}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={getBreadcrumbSchema(breadcrumbItems)} />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 border-b border-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{dictionary.category}</p>
        <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">{categoryName}</h1>
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
                {localizeCategoryName(child, dictionary)}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Both PaginatedPostGrid and Pagination read useSearchParams() (client-
          side) — Next.js requires a Suspense boundary around any such
          component on a statically-prerendered route, or the whole route
          "bails out" to client-side rendering, which fails outright under
          the OpenNext/Cloudflare ISR path (see login/page.tsx's own comment
          for the same requirement, applied to SignInForm there). The
          fallback is the REAL page-1 content, rendered directly with no
          client dependency — that's what actually ends up in the cached/
          ISR'd HTML; PaginatedPostGrid/Pagination only run after hydration,
          and render identically for the (overwhelmingly common) page-1 case. */}
      <Suspense fallback={<PostGrid items={posts} locale={locale} showHero noArticlesLabel={dictionary.noArticles} />}>
        <PaginatedPostGrid
          type="category"
          slug={category.slug}
          locale={locale}
          initialItems={posts}
          showHeroOnFirstPage
          noArticlesLabel={dictionary.noArticles}
        />
      </Suspense>

      <AdSlot slotId={`category-${category.slug}`} label="Advertisement" className="mt-10" />

      <Suspense
        fallback={
          <PaginationNav
            basePath={`/${locale}/category/${category.slug}`}
            page={1}
            totalPages={totalPages}
            previousLabel={dictionary.previous}
            nextLabel={dictionary.next}
            pageOfTemplate={dictionary.pageOf}
          />
        }
      >
        <Pagination
          basePath={`/${locale}/category/${category.slug}`}
          totalPages={totalPages}
          previousLabel={dictionary.previous}
          nextLabel={dictionary.next}
          pageOfTemplate={dictionary.pageOf}
        />
      </Suspense>
    </div>
  );
}
