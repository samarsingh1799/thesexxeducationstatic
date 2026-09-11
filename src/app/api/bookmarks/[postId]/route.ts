import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { savedArticles } from "@/db/app-schema";

/**
 * Per-article save/unsave — the private counterpart to the public,
 * cacheable article page (see app/[locale]/[category]/[slug]/page.tsx).
 * Never touches the Next.js cache: this data is per-user and must never
 * leak into a publicly-cached response.
 */

type RouteParams = { params: Promise<{ postId: string }> };

function parsePostId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ saved: false }, { status: 401 });

  const postId = parsePostId((await params).postId);
  if (!postId) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const db = await getDb();
  const [row] = await db
    .select({ id: savedArticles.id })
    .from(savedArticles)
    .where(and(eq(savedArticles.userId, session.user.id), eq(savedArticles.postId, postId)))
    .limit(1);

  return NextResponse.json({ saved: Boolean(row) });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const postId = parsePostId((await params).postId);
  if (!postId) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const body = (await request.json().catch(() => null)) as
    | { slug?: string; title?: string; categorySlug?: string; locale?: string }
    | null;
  if (!body?.slug || !body?.title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .insert(savedArticles)
    .values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      postId,
      slug: body.slug,
      categorySlug: body.categorySlug ?? null,
      locale: body.locale ?? "en",
      title: body.title,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  return NextResponse.json({ saved: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const postId = parsePostId((await params).postId);
  if (!postId) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const db = await getDb();
  await db.delete(savedArticles).where(and(eq(savedArticles.userId, session.user.id), eq(savedArticles.postId, postId)));

  return NextResponse.json({ saved: false });
}
