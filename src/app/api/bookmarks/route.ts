import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { savedArticles } from "@/db/app-schema";

/** The signed-in user's full saved-articles list — used by the account page. */
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const db = await getDb();
  const rows = await db
    .select()
    .from(savedArticles)
    .where(eq(savedArticles.userId, session.user.id))
    .orderBy(desc(savedArticles.createdAt));

  return NextResponse.json({ items: rows });
}
