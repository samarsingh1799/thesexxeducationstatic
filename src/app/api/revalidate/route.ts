import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cacheTags } from "@/lib/cache/tags";
import { locales } from "@/lib/i18n/locales";

/**
 * WordPress publish/update/delete webhook → targeted cache invalidation.
 * Secured with a shared-secret bearer token (set the same value as this
 * Worker's REVALIDATE_SECRET and in the WordPress plugin's webhook
 * config) — an unsecured revalidation endpoint would let anyone force
 * expensive re-renders or, worse, invalidate content on a schedule of
 * their choosing.
 *
 * Always prefers revalidateTag() (see lib/cache/tags.ts — every
 * WordPress fetch is tagged) over rebuilding/revalidating the whole
 * site: a single post update should invalidate that post's own page and
 * the list pages it appears on, not every page on the site.
 */
type RevalidatePayload = {
  type: "post" | "post.deleted" | "category" | "tag" | "author";
  postId?: number;
  slug?: string;
  categorySlug?: string;
};

// Next.js 16 requires a cacheLife profile as revalidateTag's 2nd arg —
// "max" (cache indefinitely, only ever cleared by an explicit tag
// invalidation like this one) matches this app's on-demand-only ISR
// model; there's no time-based expiry to also configure here.
function invalidateTag(tag: string) {
  revalidateTag(tag, "max");
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${env.REVALIDATE_SECRET}`;
  if (!env.REVALIDATE_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as RevalidatePayload | null;
  if (!payload?.type) {
    return NextResponse.json({ error: "Missing 'type'" }, { status: 400 });
  }

  const revalidatedTags: string[] = [];
  const revalidatedPaths: string[] = [];

  switch (payload.type) {
    case "post":
    case "post.deleted": {
      if (payload.postId) {
        invalidateTag(cacheTags.post(payload.postId));
        revalidatedTags.push(cacheTags.post(payload.postId));
      }
      invalidateTag(cacheTags.postsList());
      invalidateTag(cacheTags.sitemap());
      revalidatedTags.push(cacheTags.postsList(), cacheTags.sitemap());

      if (payload.slug) {
        // Every locale's copy of this article, plus the locale
        // homepages (which list recent posts) — a plain path revalidate
        // as a belt-and-suspenders alongside the tag-based one above,
        // since the tag cache is a newer mechanism and this costs
        // nothing extra to also do.
        for (const locale of locales) {
          const path = payload.categorySlug ? `/${locale.code}/${payload.categorySlug}/${payload.slug}` : `/${locale.code}/article/${payload.slug}`;
          revalidatePath(path);
          revalidatePath(`/${locale.code}`);
          revalidatedPaths.push(path);
        }
      }
      break;
    }
    case "category": {
      if (payload.categorySlug) {
        invalidateTag(cacheTags.category(payload.categorySlug));
        revalidatedTags.push(cacheTags.category(payload.categorySlug));
      }
      invalidateTag(cacheTags.categoriesList());
      revalidatedTags.push(cacheTags.categoriesList());
      break;
    }
    case "tag": {
      invalidateTag(cacheTags.tagsList());
      revalidatedTags.push(cacheTags.tagsList());
      break;
    }
    case "author": {
      invalidateTag(cacheTags.authorsList());
      revalidatedTags.push(cacheTags.authorsList());
      break;
    }
  }

  return NextResponse.json({ revalidated: true, tags: revalidatedTags, paths: revalidatedPaths });
}
