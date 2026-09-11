import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/wordpress/posts";
import { getAvailableTranslationLocales } from "@/lib/wordpress/languages";
import { locales, defaultLocale } from "@/lib/i18n/locales";

/**
 * Tells the global header language menu (components/layout/LanguageMenu.tsx)
 * which locales are safe to switch into from the current page. The header
 * lives in the root layout, above {children}, so it has no server-side way
 * to know whether the page it's rendered above is a specific article and,
 * if so, which of that article's translations are actually published.
 *
 * An optional catch-all segment (`[[...path]]`), not a `?path=` query
 * string — reading `request.nextUrl.searchParams` would unconditionally
 * force this route dynamic with no caching possible; a dynamic segment can
 * still export `generateStaticParams`/`revalidate` like a page.
 *
 * Category/tag/author/home always render for every locale regardless of
 * content, so those are reported as available everywhere without checking
 * anything. Anything else is assumed to be an article path and is checked
 * for real; an unrecognized path falls back to "available everywhere" too.
 */
const ALWAYS_SAFE = [/^\/$/, /^\/category(\/|$)/, /^\/tag(\/|$)/, /^\/author(\/|$)/, /^\/search\/?$/];

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ path?: string[] }>> {
  return [];
}

type RouteParams = { params: Promise<{ path?: string[] }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { path: segments } = await params;
  const path = segments && segments.length > 0 ? `/${segments.join("/")}` : "/";
  const allCodes = locales.map((locale) => locale.code);

  if (ALWAYS_SAFE.some((pattern) => pattern.test(path))) {
    return NextResponse.json({ locales: allCodes });
  }

  const slug = path.split("/").filter(Boolean).at(-1);
  if (!slug) return NextResponse.json({ locales: allCodes });

  const post = await getPostBySlug(slug);
  if (!post) return NextResponse.json({ locales: allCodes });

  // The English original always exists (it's what getPostBySlug just found)
  // — getAvailableTranslationLocales deliberately never includes the
  // default locale itself, so it has to be added back in here.
  const availableLocales = await getAvailableTranslationLocales(post.id);
  return NextResponse.json({ locales: [defaultLocale, ...availableLocales] });
}
