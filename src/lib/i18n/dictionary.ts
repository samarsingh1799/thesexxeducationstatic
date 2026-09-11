import "server-only";
import { locale as getRootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { isSupportedLocale, defaultLocale, type LocaleCode } from "./locales";
import en from "./dictionaries/en.json";
import hi from "./dictionaries/hi.json";
import es from "./dictionaries/es.json";
import fr from "./dictionaries/fr.json";
import de from "./dictionaries/de.json";
import pt from "./dictionaries/pt.json";

export type Dictionary = typeof en;

const dictionaries: Record<LocaleCode, Dictionary> = { en, hi, es, fr, de, pt };

/**
 * Reads the current `[locale]` root param directly via `next/root-params`
 * instead of requiring every Server Component in the tree to accept and
 * forward a `locale` prop — only Client Components (nav interactions,
 * forms) still need it passed explicitly or read via a client-side
 * pathname hook, since root-param getters don't work there. See
 * https://nextjs.org/docs/app/api-reference/functions/next-root-params.
 */
export async function getDictionary(): Promise<Dictionary> {
  const locale = await getRootLocale();
  if (!locale || !isSupportedLocale(locale)) notFound();
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
