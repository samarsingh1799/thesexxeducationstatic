"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaRegBookmark, FaBookmark } from "react-icons/fa6";
import { authClient } from "@/lib/auth/client";
import { buildAuthModalUrl } from "@/lib/auth/authModal";

type Props = {
  postId: number;
  slug: string;
  categorySlug?: string;
  locale: string;
  title: string;
};

/**
 * Private, per-user action on an otherwise fully public/cacheable article
 * page — a Client Component island, not something that touches the
 * page's own server-rendered response, so the article's cache entry
 * never varies per viewer (see app/api/bookmarks/[postId]/route.ts for
 * why this never touches the Next.js cache either).
 *
 * Renders for guests too (rather than hiding entirely) — clicking opens
 * the sign-in modal in place, with a way back to this article once
 * signed in, instead of just disappearing the affordance.
 */
export function SaveArticleButton({ postId, slug, categorySlug, locale, title }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetch(`/api/bookmarks/${postId}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ saved?: boolean }>) : null))
      .then((data) => {
        if (!cancelled && data) setSaved(Boolean(data.saved));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId, session]);

  async function toggle() {
    if (!session) {
      router.push(buildAuthModalUrl(`/${locale}/${categorySlug ?? "article"}/${slug}`, "save"), { scroll: false });
      return;
    }

    setIsBusy(true);
    try {
      if (saved) {
        await fetch(`/api/bookmarks/${postId}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await fetch(`/api/bookmarks/${postId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, categorySlug, locale, title }),
        });
        setSaved(true);
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isBusy || isPending}
      aria-pressed={saved}
      aria-label={saved ? `Remove "${title}" from saved articles` : `Save "${title}"`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
    >
      {saved ? <FaBookmark className="h-4 w-4 text-accent" /> : <FaRegBookmark className="h-4 w-4" />}
    </button>
  );
}
