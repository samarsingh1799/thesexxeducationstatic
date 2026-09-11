import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { likedArticles } from "@/db/app-schema";

type RouteParams = { params: Promise<{ postId: string }> };

function parsePostId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ liked: false }, { status: 401 });

  const postId = parsePostId((await params).postId);
  if (!postId) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const db = await getDb();
  const [row] = await db
    .select({ id: likedArticles.id })
    .from(likedArticles)
    .where(and(eq(likedArticles.userId, session.user.id), eq(likedArticles.postId, postId)))
    .limit(1);

  return NextResponse.json({ liked: Boolean(row) });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const postId = parsePostId((await params).postId);
  if (!postId) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const db = await getDb();
  await db
    .insert(likedArticles)
    .values({ id: crypto.randomUUID(), userId: session.user.id, postId, createdAt: new Date() })
    .onConflictDoNothing();

  return NextResponse.json({ liked: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const postId = parsePostId((await params).postId);
  if (!postId) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const db = await getDb();
  await db.delete(likedArticles).where(and(eq(likedArticles.userId, session.user.id), eq(likedArticles.postId, postId)));

  return NextResponse.json({ liked: false });
}
