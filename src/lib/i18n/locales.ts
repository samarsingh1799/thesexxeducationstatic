/**
 * Every locale this site supports, in one place — every other reference
 * to "which languages exist" (routing, sitemap, hreflang, the language
 * switcher) reads from this list rather than hardcoding language codes.
 * `code` is both the URL segment (/es/...) and the value WordPress's
 * translation storage keys by; `bcp47` is the hreflang/<html lang> value
 * (only differs from `code` for regional variants, e.g. a future pt-BR).
 *
 * `en` is deliberately not in this list — it's the source language
 * (WordPress's own native content), always unprefixed, and always exists.
 */
export type LocaleConfig = {
  code: string;
  label: string;
  bcp47: string;
};

export const defaultLocale = "en" as const;

export const locales: LocaleConfig[] = [
  { code: "en", label: "English", bcp47: "en" },
  { code: "hi", label: "हिन्दी", bcp47: "hi" },
  { code: "es", label: "Español", bcp47: "es" },
  { code: "fr", label: "Français", bcp47: "fr" },
];

export type LocaleCode = (typeof locales)[number]["code"];

export function isSupportedLocale(code: string): code is LocaleCode {
  return locales.some((locale) => locale.code === code);
}

export function getLocaleConfig(code: string): LocaleConfig | undefined {
  return locales.find((locale) => locale.code === code);
}
