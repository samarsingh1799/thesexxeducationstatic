import { wpFetch } from "./client";
import { cacheTags } from "@/lib/cache/tags";
import { decodeEntities } from "@/lib/content/html";
import type { Tag } from "@/types/content";
import type { WPTag } from "./wp-types";

function normalizeTag(term: WPTag): Tag {
  return { id: term.id, name: decodeEntities(term.name), slug: term.slug, count: term.count };
}

export async function getAllTags(): Promise<Tag[]> {
  const result = await wpFetch<WPTag[]>("/wp-json/wp/v2/tags", {
    searchParams: { per_page: 100, orderby: "name", order: "asc", hide_empty: true },
    tags: [cacheTags.tagsList()],
  });
  return (result?.data ?? []).map(normalizeTag);
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const result = await wpFetch<WPTag[]>("/wp-json/wp/v2/tags", {
    searchParams: { slug, per_page: 1 },
    tags: [cacheTags.tag(slug), cacheTags.tagsList()],
  });
  const term = result?.data?.[0];
  return term ? normalizeTag(term) : null;
}
