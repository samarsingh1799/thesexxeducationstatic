"use client";

import { usePathname } from "next/navigation";
import { isSupportedLocale, getLocaleConfig, defaultLocale, type LocaleConfig } from "./locales";

/** Client-side equivalent of the server-only getDictionary()'s root-param read — Client Components can't use next/root-params, so this derives the locale from the URL pathname instead (every route is prefixed, see canonical.ts). */
export function useCurrentLocale(): LocaleConfig {
  const pathname = usePathname();
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const code = firstSegment && isSupportedLocale(firstSegment) ? firstSegment : defaultLocale;
  return getLocaleConfig(code)!;
}
