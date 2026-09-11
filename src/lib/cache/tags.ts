/**
 * Every Next.js cache tag this app uses, in one place — so a WordPress
 * webhook payload (see app/api/revalidate/route.ts) and every WordPress
 * fetch (see lib/wordpress/*.ts) always agree on the same tag string for
 * the same piece of content. Never construct a tag string by hand
 * anywhere else.
 */
export const cacheTags = {
  post: (postId: number) => `post-${postId}`,
  postsList: () => "posts-list",
  category: (slug: string) => `category-${slug}`,
  categoriesList: () => "categories-list",
  tag: (slug: string) => `tag-${slug}`,
  tagsList: () => "tags-list",
  author: (slug: string) => `author-${slug}`,
  authorsList: () => "authors-list",
  sitemap: () => "sitemap",
} as const;
