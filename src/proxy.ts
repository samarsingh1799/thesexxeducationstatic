import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSupportedLocale, defaultLocale } from "@/lib/i18n/locales";

/**
 * Legacy URL migration: before this site's locale-prefixed routing existed,
 * every English page was served unprefixed —
 *   /pms-pmdd/pms-vs-pmdd-whats-the-difference
 * instead of
 *   /en/pms-pmdd/pms-vs-pmdd-whats-the-difference
 * (and likewise /category/{slug}, /tag/{slug}, /author/{slug}, /login,
 * /about-us, etc. — every route that now lives under app/[locale]/...).
 * Those old URLs are real, ranked, indexed search results and backlinks —
 * losing them to a 404 would throw away that SEO equity outright. Instead,
 * permanently (308, method- and SEO-signal-preserving) redirect any request
 * whose first path segment isn't a recognized locale to the identical path
 * under /en, the default locale — covering every one of those old routes
 * with a single rule, since they were all unprefixed English by definition.
 *
 * Named `proxy` (not `middleware`): Next.js 16 renamed the file convention
 * — see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
 * The `/` root path itself is deliberately left alone here (it has no first
 * segment at all) — it already has its own permanentRedirect to /en in
 * app/page.tsx, unrelated to this legacy-path rule.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split("/").filter(Boolean)[0];

  if (firstSegment && !isSupportedLocale(firstSegment)) {
    return NextResponse.redirect(new URL(`/${defaultLocale}${pathname}${search}`, request.url), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude API routes, static files, image optimization, and the
    // metadata/sitemap routes (all of which live at the root, unprefixed,
    // by design — see lib/seo/sitemap-entries.ts — and must never be
    // redirected).
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap).*)",
  ],
};
