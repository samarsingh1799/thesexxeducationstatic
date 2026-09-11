import { NextResponse } from "next/server";
import { getPosts } from "@/lib/wordpress/posts";
import { getCategoryBySlug, getCategoryHierarchy, getDescendantCategoryIds } from "@/lib/wordpress/categories";
import { getTagBySlug } from "@/lib/wordpress/tags";
import { getAuthorBySlug } from "@/lib/wordpress/authors";
import { getTranslatedPostSummaries } from "@/lib/wordpress/languages";
import { isSupportedLocale, defaultLocale } from "@/lib/i18n/locales";

/**
 * Backs client-side pagination on the category/tag/author listing pages
 * (components/article/PaginatedPostGrid.tsx): those pages now only render
 * page 1 server-side (so they can be ISR-cached — see the route files'
 * own comments), and fetch any later page through here instead of a full
 * server re-render. Never used for page 1, which ships with the cached
 * HTML directly.
 */

const PER_PAGE: Record<string, number> = { category: 13, tag: 13, author: 12, latest: 13 };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const slug = searchParams.get("slug");
  const localeParam = searchParams.get("locale");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  // Every type except "latest" (every published post, unfiltered) needs a slug.
  if (!type || !(type in PER_PAGE) || (type !== "latest" && !slug)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const locale = localeParam && isSupportedLocale(localeParam) ? localeParam : defaultLocale;
  const perPage = PER_PAGE[type];

  const result = await (async () => {
    if (type === "latest") {
      return getPosts({ page, perPage });
    }
    if (type === "category") {
      const category = await getCategoryBySlug(slug!);
      if (!category) return null;
      const hierarchy = await getCategoryHierarchy();
      const categoryIds = getDescendantCategoryIds(category.id, hierarchy);
      return getPosts({ categoryIds, page, perPage });
    }
    if (type === "tag") {
      const tag = await getTagBySlug(slug!);
      if (!tag) return null;
      return getPosts({ tagId: tag.id, page, perPage });
    }
    const author = await getAuthorBySlug(slug!);
    if (!author) return null;
    return getPosts({ authorId: author.id, page, perPage });
  })();

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await getTranslatedPostSummaries(result.items, locale);
  return NextResponse.json({ items, totalPages: result.totalPages, totalItems: result.totalItems });
}
