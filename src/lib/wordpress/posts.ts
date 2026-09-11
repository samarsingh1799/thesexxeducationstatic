import { wpFetch } from "./client";
import { cacheTags } from "@/lib/cache/tags";
import { decodeEntities, stripHtml } from "@/lib/content/html";
import type { Post, PostSummary, Category, Author, FeaturedImage } from "@/types/content";
import type { WPPost, WPTerm } from "./wp-types";

function pickCategoryTerm(embedded: WPPost["_embedded"]): WPTerm | undefined {
  return embedded?.["wp:term"]?.flat().find((term) => term.taxonomy === "category");
}

function pickTagTerms(embedded: WPPost["_embedded"]): WPTerm[] {
  return embedded?.["wp:term"]?.flat().filter((term) => term.taxonomy === "post_tag") ?? [];
}

function normalizeFeaturedImage(post: WPPost): FeaturedImage | undefined {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  if (!media) return undefined;
  return {
    url: media.source_url,
    alt: media.alt_text ? decodeEntities(media.alt_text) : decodeEntities(post.title.rendered),
    width: media.media_details?.width,
    height: media.media_details?.height,
  };
}

function normalizeAuthorFromEmbed(post: WPPost): Author {
  const user = post._embedded?.author?.[0];
  return {
    id: user?.id ?? post.author,
    name: user ? decodeEntities(user.name) : "Unknown",
    slug: user?.slug ?? String(post.author),
    avatarUrl: user?.avatar_urls ? Object.values(user.avatar_urls).pop() : undefined,
  };
}

function normalizeCategoryFromEmbed(post: WPPost): Category | undefined {
  const term = pickCategoryTerm(post._embedded);
  if (!term) return undefined;
  return { id: term.id, name: decodeEntities(term.name), slug: term.slug, count: term.count, parentId: term.parent || undefined };
}

function normalizePostSummary(post: WPPost): PostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: decodeEntities(post.title.rendered),
    excerpt: stripHtml(post.excerpt.rendered),
    publishedAt: `${post.date_gmt}Z`,
    modifiedAt: `${post.modified_gmt}Z`,
    category: normalizeCategoryFromEmbed(post),
    author: normalizeAuthorFromEmbed(post),
    featuredImage: normalizeFeaturedImage(post),
  };
}

function normalizePost(post: WPPost): Post {
  return {
    ...normalizePostSummary(post),
    contentHtml: post.content.rendered,
    tags: pickTagTerms(post._embedded).map((term) => ({ id: term.id, name: decodeEntities(term.name), slug: term.slug, count: term.count })),
    seo: {
      title: post.meta?.rank_math_title ? decodeEntities(post.meta.rank_math_title) : undefined,
      description: post.meta?.rank_math_description ? decodeEntities(post.meta.rank_math_description) : undefined,
    },
  };
}

export type GetPostsParams = {
  page?: number;
  perPage?: number;
  categoryId?: number;
  categoryIds?: number[];
  tagId?: number;
  authorId?: number;
  search?: string;
  excludeIds?: number[];
};

export async function getPosts(params: GetPostsParams = {}): Promise<{ items: PostSummary[]; totalPages: number; totalItems: number }> {
  const { page = 1, perPage = 12, categoryId, categoryIds, tagId, authorId, search, excludeIds } = params;

  const categoriesParam = categoryIds && categoryIds.length > 0 ? categoryIds.join(",") : categoryId;
  const excludeParam = excludeIds && excludeIds.length > 0 ? excludeIds.join(",") : undefined;

  const result = await wpFetch<WPPost[]>("/wp-json/wp/v2/posts", {
    searchParams: {
      page,
      per_page: perPage,
      _embed: 1,
      categories: categoriesParam,
      tags: tagId,
      author: authorId,
      search,
      exclude: excludeParam,
      orderby: "date",
      order: "desc",
    },
    tags: [
      cacheTags.postsList(),
      ...(categoryId ? [cacheTags.category(String(categoryId))] : []),
      ...(tagId ? [cacheTags.tag(String(tagId))] : []),
    ],
  });

  return {
    items: (result?.data ?? []).map(normalizePostSummary),
    totalPages: result?.totalPages ?? 1,
    totalItems: result?.totalItems ?? 0,
  };
}

/** React `cache()`-free by design (this is a plain server module, not a component tree) — callers that need per-request de-dup (metadata + page body both wanting the same post) should wrap this themselves; see app/[locale]/[category]/[slug]/page.tsx. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const result = await wpFetch<WPPost[]>("/wp-json/wp/v2/posts", {
    searchParams: { slug, per_page: 1, _embed: 1 },
    tags: [cacheTags.postsList()],
  });
  const post = result?.data?.[0];
  return post ? normalizePost(post) : null;
}

export async function getPostById(id: number): Promise<Post | null> {
  const result = await wpFetch<WPPost>(`/wp-json/wp/v2/posts/${id}`, {
    searchParams: { _embed: 1 },
    tags: [cacheTags.post(id), cacheTags.postsList()],
  });
  return result?.data ? normalizePost(result.data) : null;
}

/** Every published post's slug + category — the minimum needed to build sitemaps and generateStaticParams without fetching full post bodies. */
export async function getAllPublishedSlugs(): Promise<Array<{ id: number; slug: string; categorySlug: string | undefined; modifiedAt: string }>> {
  const MAX_PAGES = 50;
  const perPage = 100;
  const slugs: Array<{ id: number; slug: string; categorySlug: string | undefined; modifiedAt: string }> = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await wpFetch<WPPost[]>("/wp-json/wp/v2/posts", {
      searchParams: { page, per_page: perPage, _embed: 1 },
      tags: [cacheTags.postsList(), cacheTags.sitemap()],
    });
    if (!result || result.data.length === 0) break;

    for (const post of result.data) {
      slugs.push({ id: post.id, slug: post.slug, categorySlug: pickCategoryTerm(post._embedded)?.slug, modifiedAt: `${post.modified_gmt}Z` });
    }
    if (page >= result.totalPages) break;
  }

  return slugs;
}

/** Same category (or, failing that, a shared tag) as `post`, excluding itself — never a fabricated link. */
export async function getRelatedPosts(post: Post, limit = 3): Promise<PostSummary[]> {
  if (post.category) {
    const byCategory = await getPosts({ categoryId: post.category.id, perPage: limit + 1 });
    const filtered = byCategory.items.filter((item) => item.id !== post.id).slice(0, limit);
    if (filtered.length > 0) return filtered;
  }
  if (post.tags[0]) {
    const byTag = await getPosts({ tagId: post.tags[0].id, perPage: limit + 1 });
    return byTag.items.filter((item) => item.id !== post.id).slice(0, limit);
  }
  return [];
}
