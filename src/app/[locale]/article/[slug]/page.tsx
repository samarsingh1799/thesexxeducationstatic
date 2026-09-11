import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslatedPost, getAvailableTranslationLocales } from "@/lib/wordpress/languages";
import { isSupportedLocale } from "@/lib/i18n/locales";
import { getArticlePath, getArticleTranslationUrls } from "@/lib/seo/canonical";
import { buildArticleMetadata } from "@/lib/seo/metadata";

/**
 * The rare categoryless-post fallback — every categorized post permanently
 * redirects from here to its real `/{category}/{slug}` canonical path
 * (see getArticlePath), so this route only ever actually renders content
 * for a post with no category at all. Always dynamic (no
 * generateStaticParams): categoryless posts are rare enough that
 * build-time prerendering isn't worth the complexity.
 */

type RouteParams = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) return {};

  const post = await getTranslatedPost(locale, slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: true } };

  const availableLocales = await getAvailableTranslationLocales(post.id);
  return buildArticleMetadata(post, getArticlePath(locale, post.category?.slug, post.slug), getArticleTranslationUrls(post.category?.slug, post.slug, availableLocales));
}

export default async function LegacyArticlePage({ params }: RouteParams) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const post = await getTranslatedPost(locale, slug);
  if (!post) notFound();

  const canonicalPath = getArticlePath(locale, post.category?.slug, post.slug);
  if (canonicalPath !== `/${locale}/article/${slug}`) {
    permanentRedirect(canonicalPath);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ink md:text-4xl">{post.title}</h1>
    </div>
  );
}
