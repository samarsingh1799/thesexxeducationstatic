import { NextResponse } from "next/server";
import { getPosts } from "@/lib/wordpress/posts";

/**
 * Backs the header's search modal (components/layout/SearchModal.tsx):
 * no `q` returns a default "Popular Reads" list (most recent posts —
 * this project has no page-view-independent popularity signal beyond
 * lib/wordpress/trending.ts, which is article-page-scoped), a `q` proxies
 * WordPress's own `?search=` REST param, same v1 approach as
 * app/[locale]/search/page.tsx.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const { items } = await getPosts(q ? { search: q, perPage: 10 } : { perPage: 6 });
  return NextResponse.json(items);
}
