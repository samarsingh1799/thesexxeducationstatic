import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAuthorBySlug } from "@/lib/wordpress/authors";
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

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

type RouteParams = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale, slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Author not found", robots: { index: false, follow: true } };

  return buildPageMetadata({
    title: author.name,
    description: author.bio || `Articles by ${author.name}.`,
    path: `/${locale}/author/${slug}`,
    translations: getTranslationUrls(`/author/${slug}`),
  });
}

export default async function AuthorPage({ params, searchParams }: RouteParams) {
  const { locale, slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  if (!isSupportedLocale(locale)) notFound();

  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const [dictionary, { items: englishPosts, totalPages }] = await Promise.all([
    getDictionary(),
    getPosts({ authorId: author.id, page, perPage: PER_PAGE }),
  ]);
  const posts = await getTranslatedPostSummaries(englishPosts, locale);

  const breadcrumbItems = [
    { name: dictionary.home, href: `/${locale}` },
    { name: author.name, href: `/${locale}/author/${slug}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={getBreadcrumbSchema(breadcrumbItems)} />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 flex items-center gap-4 border-b border-border pb-8">
        {author.avatarUrl ? (
          <Image
            src={author.avatarUrl}
            alt=""
            width={72}
            height={72}
            className="h-18 w-18 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-18 w-18 items-center justify-center rounded-full bg-accent-soft text-xl font-bold text-accent-dark">
            {author.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Author</p>
          <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">{author.name}</h1>
          {author.bio && <p className="mt-1 max-w-2xl text-ink-muted">{author.bio}</p>}
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="mt-8 text-ink-muted">{dictionary.noArticles}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <ArticleCard key={post.slug} post={post} variant="compact" locale={locale} />
          ))}
        </div>
      )}

      <Pagination basePath={`/${locale}/author/${author.slug}`} page={page} totalPages={totalPages} locale={locale} />
    </div>
  );
}
