import { getAllPublishedSlugs } from "@/lib/wordpress/posts";
import { getAllCategories } from "@/lib/wordpress/categories";
import { getAllAuthors } from "@/lib/wordpress/authors";
import { getAvailableTranslationLocales } from "@/lib/wordpress/languages";
import { locales, defaultLocale } from "@/lib/i18n/locales";
import { getArticlePath, getCanonicalUrl } from "./canonical";
import type { SitemapUrlEntry } from "./sitemap-xml";

/** Every published post's URL for one locale — English gets everything; other locales only what's actually translated (never a sitemap entry pointing at a 404). */
export async function getPostsSitemapEntries(localeCode: string): Promise<SitemapUrlEntry[]> {
  try {
    const posts = await getAllPublishedSlugs();

    const entries = await Promise.all(
      posts.map(async (post): Promise<SitemapUrlEntry | null> => {
        if (localeCode !== defaultLocale) {
          const availableLocales = await getAvailableTranslationLocales(post.id);
          if (!availableLocales.includes(localeCode)) return null;
        }
        return {
          loc: getCanonicalUrl(getArticlePath(localeCode, post.categorySlug, post.slug)),
          lastModified: post.modifiedAt,
          changeFrequency: "weekly",
          priority: 0.7,
        };
      })
    );

    return entries.filter((entry): entry is SitemapUrlEntry => entry !== null);
  } catch (err) {
    console.error(`Failed to generate posts sitemap entries for ${localeCode}:`, err);
    return [];
  }
}

/** Static informational/legal pages linked from the footer — content is the same for every locale, but each locale still gets its own served, indexable URL. */
const STATIC_PAGE_SLUGS = [
  "about-us",
  "contact",
  "editorial-policy",
  "corrections-policy",
  "accessibility",
  "age-content-notice",
  "privacy-policy",
  "cookie-policy",
  "terms-and-conditions",
  "health-disclaimer",
  "copyright",
  "advertising-disclosure",
];

/** Home + category + author + static info/legal pages for every locale — these always render regardless of translated-post count (a translated-empty state, never a 404), so no availability filtering needed. */
export async function getPagesSitemapEntries(): Promise<SitemapUrlEntry[]> {
  try {
    const [categories, authors] = await Promise.all([getAllCategories(), getAllAuthors()]);
    const entries: SitemapUrlEntry[] = [];

    for (const locale of locales) {
      entries.push({ loc: getCanonicalUrl(`/${locale.code}`), changeFrequency: "daily", priority: 1.0 });
      entries.push({ loc: getCanonicalUrl(`/${locale.code}/latest`), changeFrequency: "daily", priority: 0.6 });
      for (const category of categories) {
        entries.push({ loc: getCanonicalUrl(`/${locale.code}/category/${category.slug}`), changeFrequency: "daily", priority: 0.5 });
      }
      for (const author of authors) {
        entries.push({ loc: getCanonicalUrl(`/${locale.code}/author/${author.slug}`), changeFrequency: "weekly", priority: 0.3 });
      }
      for (const slug of STATIC_PAGE_SLUGS) {
        entries.push({ loc: getCanonicalUrl(`/${locale.code}/${slug}`), changeFrequency: "monthly", priority: 0.2 });
      }
    }

    return entries;
  } catch (err) {
    console.error("Failed to generate pages sitemap entries:", err);
    return [];
  }
}
