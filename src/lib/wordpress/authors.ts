import { wpFetch } from "./client";
import { cacheTags } from "@/lib/cache/tags";
import { decodeEntities } from "@/lib/content/html";
import type { Author } from "@/types/content";
import type { WPUser } from "./wp-types";

function normalizeAuthor(user: WPUser): Author {
  return {
    id: user.id,
    name: decodeEntities(user.name),
    slug: user.slug,
    avatarUrl: user.avatar_urls ? Object.values(user.avatar_urls).pop() : undefined,
    bio: user.description ? decodeEntities(user.description) : undefined,
  };
}

// No `who: "authors"` filter: that param requires an authenticated
// request (WordPress core gates it behind the `list_users` capability),
// which this public-facing app deliberately never has. Omitting it still
// gives the right result — WordPress's unauthenticated `/users` endpoint
// already only lists users with at least one published post, which is
// exactly "authors" for this app's purposes.
export async function getAllAuthors(): Promise<Author[]> {
  try {
    const result = await wpFetch<WPUser[]>("/wp-json/wp/v2/users", {
      searchParams: { per_page: 100 },
      tags: [cacheTags.authorsList()],
    });
    return (result?.data ?? []).map(normalizeAuthor);
  } catch (err) {
    console.error("Failed to fetch authors:", err);
    return [];
  }
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  try {
    const result = await wpFetch<WPUser[]>("/wp-json/wp/v2/users", {
      searchParams: { slug, per_page: 1 },
      tags: [cacheTags.author(slug), cacheTags.authorsList()],
    });
    const user = result?.data?.[0];
    return user ? normalizeAuthor(user) : null;
  } catch (err) {
    console.error(`Failed to fetch author by slug (${slug}):`, err);
    return null;
  }
}
