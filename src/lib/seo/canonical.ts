import { siteConfig } from "./site-config";
import { locales } from "@/lib/i18n/locales";

/**
 * Every locale — including the default (`en`) — is prefixed
 * (/en/..., /hi/..., /es/...), never a bare unprefixed route. One
 * uniform rule for every locale is simpler to reason about than
 * special-casing the source language, and it's what lets a single
 * `app/[locale]/...` segment serve all of them with no separate
 * "default locale" branch anywhere in the routing.
 */
export function getLocalizedPath(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

export function getArticlePath(locale: string, categorySlug: string | undefined, slug: string): string {
  return categorySlug ? getLocalizedPath(locale, `/${categorySlug}/${slug}`) : getLocalizedPath(locale, `/article/${slug}`);
}

export function getCanonicalUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

/**
 * hreflang map for a specific article: only the locales it's actually
 * published in (see wordpress/languages.ts#getAvailableTranslationLocales)
 * plus the English source, keyed by BCP 47 tag — `x-default` points at
 * English, the source-of-truth version. Never include a locale here that
 * doesn't have real, published content: an hreflang pointing at a 404 is
 * worse than no hreflang at all.
 */
export function getArticleTranslationUrls(
  categorySlug: string | undefined,
  slug: string,
  availableLocales: string[]
): Record<string, string> {
  const urls: Record<string, string> = {
    en: getCanonicalUrl(getArticlePath("en", categorySlug, slug)),
  };
  for (const code of availableLocales) {
    urls[code] = getCanonicalUrl(getArticlePath(code, categorySlug, slug));
  }
  urls["x-default"] = urls.en;
  return urls;
}

/** Same idea for non-article pages (home, category, tag, author) that render in every locale regardless of content — every configured locale gets an entry, no availability check needed. */
export function getTranslationUrls(path: string): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const locale of locales) {
    urls[locale.bcp47] = getCanonicalUrl(getLocalizedPath(locale.code, path));
  }
  urls["x-default"] = getCanonicalUrl(getLocalizedPath("en", path));
  return urls;
}
