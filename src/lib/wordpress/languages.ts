import { wpFetch } from "./client";
import { locales, defaultLocale } from "@/lib/i18n/locales";
import { getLocalizedCategoryName } from "@/lib/i18n/categoryNames";
import type { Post, PostSummary } from "@/types/content";
import { getPostBySlug } from "./posts";

/**
 * Multi-language article content on this WordPress instance is stored by
 * a site-specific plugin (REST namespace `sexxedu/v1`) rather than a
 * general-purpose i18n plugin like WPML/Polylang — this file is the one
 * place that knows that. If this project is ever pointed at a different
 * WordPress instance without that plugin, this is the only file that
 * needs to change (e.g. to a WPML/Polylang REST call, or a `language`
 * taxonomy convention) — every route/component calls the functions below,
 * never the plugin's endpoints directly.
 */

type TranslationPayload = {
  title: string;
  content: string;
  excerpt: string;
  seoTitle?: string;
  seoDescription?: string;
};

async function getStoredTranslation(postId: number, locale: string): Promise<TranslationPayload | null> {
  const result = await wpFetch<{ success: boolean; data: TranslationPayload }>(
    `/wp-json/sexxedu/v1/translations/${postId}/${locale}`,
    { revalidate: false, tags: [`translation-${postId}-${locale}`] }
  );
  return result?.data?.data ?? null;
}

/**
 * Which configured non-English locales have an actual published
 * translation of this post. `Promise.allSettled`, not `Promise.all`: this
 * runs during static generation for every article (even the English
 * original, via the language switcher), so one locale's lookup throwing
 * (a transient hiccup) must never fail the whole page/build — worst case,
 * that locale is unavailable until the next successful check.
 */
export async function getAvailableTranslationLocales(postId: number): Promise<string[]> {
  const translatable = locales.filter((locale) => locale.code !== defaultLocale);
  const results = await Promise.allSettled(translatable.map((locale) => getStoredTranslation(postId, locale.code)));

  return translatable
    .filter((_, index) => results[index].status === "fulfilled" && (results[index] as PromiseFulfilledResult<TranslationPayload | null>).value !== null)
    .map((locale) => locale.code);
}

/**
 * The English `Post` translated into one locale — same shape, so every
 * component that already renders a `Post` needs zero changes to render a
 * translated one. Only title/excerpt/content/SEO fields come from the
 * stored translation; author, dates and the featured image stay as-is
 * (this project's v1 scope, matching the same simplification used
 * elsewhere) — but the category's display *name* is also localized here,
 * via the hand-maintained map in lib/i18n/categoryNames.ts, since
 * WordPress itself has no mechanism to translate taxonomy names the way
 * it does post content. The category's id/slug/description/count are
 * untouched. Returns null (never partial/English content) whenever a
 * translation doesn't exist yet — the caller 404s, exactly like any other
 * not-yet-published post.
 */
export async function getTranslatedPost(locale: string, slug: string): Promise<Post | null> {
  if (locale === defaultLocale) return getPostBySlug(slug);

  const post = await getPostBySlug(slug);
  if (!post) return null;

  const translation = await getStoredTranslation(post.id, locale);
  if (!translation) return null;

  return {
    ...post,
    title: translation.title,
    excerpt: translation.excerpt,
    contentHtml: translation.content,
    category: post.category ? { ...post.category, name: getLocalizedCategoryName(post.category, locale) } : undefined,
    seo: {
      title: translation.seoTitle ?? undefined,
      description: translation.seoDescription ?? undefined,
    },
  };
}

/**
 * A list of post summaries (home/category/tag/author pages), filtered on
 * a translated locale to only the ones that actually have a published
 * translation — showing an English title/excerpt on a `/hi` page would be
 * a worse experience than showing fewer, but genuinely Hindi, articles.
 * `Promise.allSettled` for the same reason as getAvailableTranslationLocales.
 */
export async function getTranslatedPostSummaries(posts: PostSummary[], locale: string): Promise<PostSummary[]> {
  if (locale === defaultLocale) return posts;

  const results = await Promise.allSettled(posts.map((post) => getStoredTranslation(post.id, locale)));

  return posts.flatMap((post, index) => {
    const result = results[index];
    if (result.status !== "fulfilled" || !result.value) return [];
    return [
      {
        ...post,
        title: result.value.title,
        excerpt: result.value.excerpt,
        category: post.category ? { ...post.category, name: getLocalizedCategoryName(post.category, locale) } : undefined,
      },
    ];
  });
}
