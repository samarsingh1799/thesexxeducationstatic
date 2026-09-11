"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@/lib/i18n/locales";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import { setPreferredLocale } from "@/lib/i18n/languagePreference";
import { GlobeIcon } from "./icons";

/**
 * Global language switcher, lives in SiteHeader — every locale (English
 * included) is prefixed in this project, so unlike a site where English is
 * the bare/unprefixed default, there's no special case here: strip
 * whatever one locale segment is present, then re-prefix for the target.
 *
 * A plain prefix swap could 404 on an article whose specific translation
 * isn't published — this component doesn't know that from the pathname
 * alone (the header renders above {children}), so it asks
 * /api/language-availability, which does. Locales are optimistically
 * enabled while that request is in flight or if it fails.
 */
export function LanguageMenu() {
  const pathname = usePathname();
  const current = useCurrentLocale();
  const segments = pathname.split("/").filter(Boolean);
  const restPath = segments.slice(1).join("/");
  const [availableCodes, setAvailableCodes] = useState<string[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const encodedSegments = restPath.split("/").filter(Boolean).map(encodeURIComponent).join("/");
    const url = encodedSegments ? `/api/language-availability/${encodedSegments}` : "/api/language-availability";

    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ locales?: string[] }>) : null))
      .then((data) => {
        if (data && Array.isArray(data.locales)) setAvailableCodes(data.locales);
      })
      .catch(() => {
        // Aborted (navigated away) or network error — optimistic default stands.
      });

    return () => controller.abort();
  }, [restPath]);

  return (
    <div className="group relative flex">
      <button
        type="button"
        aria-label="Change language"
        className="flex items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-accent"
      >
        <GlobeIcon className="h-5 w-5" />
        <span className="hidden sm:inline">{current.label}</span>
      </button>

      <div className="invisible absolute right-0 top-full z-50 w-44 rounded-xl border border-border bg-white opacity-0 shadow-lg transition-[visibility,opacity] delay-300 duration-150 group-hover:visible group-hover:opacity-100 group-hover:delay-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:delay-0">
        <nav aria-label="Languages" className="flex flex-col p-2">
          {locales.map((locale) => {
            const available = availableCodes === null || availableCodes.includes(locale.code);
            const href = `/${locale.code}${restPath ? `/${restPath}` : ""}`;
            return available ? (
              <Link
                key={locale.code}
                href={href}
                onClick={() => setPreferredLocale(locale.code)}
                className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent-soft ${
                  locale.code === current.code ? "font-semibold text-accent bg-accent-soft/50" : "text-ink"
                }`}
              >
                {locale.label}
              </Link>
            ) : (
              <span
                key={locale.code}
                aria-disabled="true"
                title="Not translated yet"
                className="rounded-md px-3 py-2 text-sm text-ink-muted/50 cursor-not-allowed"
              >
                {locale.label}
              </span>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
