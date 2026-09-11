import "server-only";
import { desc, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { postViews } from "@/db/app-schema";
import { getPostById, getPosts } from "./posts";
import type { PostSummary } from "@/types/content";

/**
 * Real most-viewed posts, sourced from D1's post_views table (incremented
 * by ViewTracker.tsx on every article page load) — never a fabricated
 * *ranking*. If the site simply doesn't have `limit` worth of view data
 * yet (a fresh deployment, or just a quiet news day), the remainder is
 * backfilled with the most recent posts rather than leaving the
 * "Trending" rail empty — every post shown is still a real, published
 * article, just not all of them are ranked by actual view count.
 */
export async function getTrendingPosts(limit: number, excludeIds: number[] = []): Promise<PostSummary[]> {
  const db = await getDb();
  const rows = await db
    .select({ postId: postViews.postId })
    .from(postViews)
    .where(excludeIds.length > 0 ? notInArray(postViews.postId, excludeIds) : undefined)
    .orderBy(desc(postViews.count))
    .limit(limit);

  const posts = await Promise.all(rows.map((row) => getPostById(row.postId)));
  const ranked = posts.filter((post): post is NonNullable<typeof post> => post !== null);
  if (ranked.length >= limit) return ranked;

  const alreadyShown = new Set([...excludeIds, ...ranked.map((post) => post.id)]);
  const { items: recent } = await getPosts({ perPage: limit - ranked.length + alreadyShown.size });
  const backfill = recent.filter((post) => !alreadyShown.has(post.id)).slice(0, limit - ranked.length);

  return [...ranked, ...backfill];
}
