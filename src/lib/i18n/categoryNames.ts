import type { Category, CategoryWithChildren } from "@/types/content";
import type { Dictionary } from "./dictionary";
import type { LocaleCode } from "./locales";
import en from "./dictionaries/en.json";
import hi from "./dictionaries/hi.json";
import es from "./dictionaries/es.json";
import fr from "./dictionaries/fr.json";
import de from "./dictionaries/de.json";
import pt from "./dictionaries/pt.json";

/**
 * `category.name` as returned by WordPress is always whatever language the
 * category was created in (English, on this site) — WordPress has no
 * built-in mechanism to translate taxonomy term names the way post content
 * is translated (see lib/wordpress/languages.ts, which uses this to also
 * localize the `category` embedded on every translated post/post summary).
 * This is a small, hand-maintained display-name translation map
 * (dictionaries/*.json's `categoryNames`, keyed by category slug). It never
 * touches the category's real WordPress `name`/`description`/id/slug used
 * elsewhere (e.g. the fallback SEO description on category pages — see
 * dictionary.articlesInCategory). Falls back to the WordPress name whenever
 * a slug isn't in the map yet (a newly added WordPress category, for
 * example) — never a blank or missing label.
 */
const CATEGORY_NAMES_BY_LOCALE: Record<LocaleCode, Record<string, string>> = {
  en: en.categoryNames,
  hi: hi.categoryNames,
  es: es.categoryNames,
  fr: fr.categoryNames,
  de: de.categoryNames,
  pt: pt.categoryNames,
};

/** For Server Components that already have a full Dictionary from getDictionary() (reads locale via next/root-params — only works inside a [locale] route segment). */
export function localizeCategoryName(category: Pick<Category, "slug" | "name">, dictionary: Dictionary): string {
  const names = dictionary.categoryNames as Record<string, string>;
  return names[category.slug] ?? category.name;
}

/**
 * Same lookup, keyed by an explicit locale string instead of a Dictionary
 * object — for code that only has a `locale` parameter and must also work
 * outside a [locale] route segment (lib/wordpress/languages.ts is called
 * from app/api/listings/route.ts, a plain Route Handler with no root
 * param getDictionary() could read).
 */
export function getLocalizedCategoryName(category: Pick<Category, "slug" | "name">, locale: string): string {
  const names = CATEGORY_NAMES_BY_LOCALE[locale as LocaleCode] ?? {};
  return names[category.slug] ?? category.name;
}

/** Same as localizeCategoryName, applied to a whole category tree (parents + their children) at once — see components/layout/SiteHeader.tsx and app/[locale]/page.tsx. */
export function localizeCategoryTree(categories: CategoryWithChildren[], dictionary: Dictionary): CategoryWithChildren[] {
  return categories.map((category) => ({
    ...category,
    name: localizeCategoryName(category, dictionary),
    children: category.children.map((child) => ({ ...child, name: localizeCategoryName(child, dictionary) })),
  }));
}
