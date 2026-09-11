"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaRegHeart, FaHeart } from "react-icons/fa6";
import { authClient } from "@/lib/auth/client";

type Props = {
  postId: number;
  slug: string;
  categorySlug?: string;
  locale: string;
  title: string;
};

/**
 * Same self-contained client-island shape as SaveArticleButton, including
 * rendering for guests and redirecting to sign-in (with a way back to this
 * article) on click rather than hiding entirely.
 */
export function LikeArticleButton({ postId, slug, categorySlug, locale, title }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetch(`/api/likes/${postId}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ liked?: boolean }>) : null))
      .then((data) => {
        if (!cancelled && data) setLiked(Boolean(data.liked));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId, session]);

  async function toggle() {
    if (!session) {
      router.push(`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/${categorySlug ?? "article"}/${slug}`)}`);
      return;
    }

    setIsBusy(true);
    try {
      if (liked) {
        await fetch(`/api/likes/${postId}`, { method: "DELETE" });
        setLiked(false);
      } else {
        await fetch(`/api/likes/${postId}`, { method: "POST" });
        setLiked(true);
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
      aria-pressed={liked}
      aria-label={liked ? `Unlike "${title}"` : `Like "${title}"`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
    >
      {liked ? <FaHeart className="h-4 w-4 text-accent" /> : <FaRegHeart className="h-4 w-4" />}
    </button>
  );
}
