import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { comments } from "@/db/app-schema";
import { getPostById } from "@/lib/wordpress/posts";

/**
 * Reader comments — app-owned (D1), never mirrored into WordPress, same
 * pattern as /api/likes/[postId]. Reading the list needs no auth; posting
 * requires a signed-in session (checked server-side here, never trusted
 * from the client) — see components/article/CommentsSection.tsx for the
 * sign-in-gated UI.
 */

const MIN_CONTENT_LENGTH = 2;
const MAX_CONTENT_LENGTH = 3000;

type RouteParams = { params: Promise<{ postId: string }> };

function parsePostId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const postId = parsePostId((await params).postId);
  if (!postId) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const db = await getDb();
  const rows = await db
    .select({ id: comments.id, authorName: comments.authorName, content: comments.content, createdAt: comments.createdAt })
    .from(comments)
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));

  return NextResponse.json({ items: rows });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const postId = parsePostId((await params).postId);
  if (!postId) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const payload = (await request.json().catch(() => null)) as { content?: string } | null;
  const content = payload?.content?.trim();

  if (!content || content.length < MIN_CONTENT_LENGTH || content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `Comment must be between ${MIN_CONTENT_LENGTH} and ${MAX_CONTENT_LENGTH} characters.` },
      { status: 400 }
    );
  }

  // Validated server-side against the real WordPress post rather than
  // trusted from the client — never accept a comment for a postId that
  // doesn't actually exist (getPostById is cache-backed, so this costs a
  // real WordPress round trip only on a cold cache).
  const post = await getPostById(postId);
  if (!post) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  const comment = {
    id: crypto.randomUUID(),
    userId: session.user.id,
    postId,
    authorName: session.user.name,
    content,
    createdAt: new Date(),
  };

  const db = await getDb();
  await db.insert(comments).values(comment);

  return NextResponse.json(
    { id: comment.id, authorName: comment.authorName, content: comment.content, createdAt: comment.createdAt },
    { status: 201 }
  );
}
