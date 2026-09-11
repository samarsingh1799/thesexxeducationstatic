import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { postViews } from "@/db/app-schema";

type RouteParams = { params: Promise<{ postId: string }> };

function parsePostId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Fire-and-forget view counter — no auth, anonymous, the sole input to "Trending" (see lib/wordpress/trending.ts). Never blocks or fails the page render that calls it (see ViewTracker.tsx). */
export async function POST(_request: Request, { params }: RouteParams) {
  const postId = parsePostId((await params).postId);
  if (!postId) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const db = await getDb();
  await db
    .insert(postViews)
    .values({ postId, count: 1 })
    .onConflictDoUpdate({ target: postViews.postId, set: { count: sql`${postViews.count} + 1` } });

  return NextResponse.json({ ok: true });
}
