"use client";

import { useEffect } from "react";

/** Invisible — fires one fire-and-forget POST per article page load, the sole input to the homepage/sidebar's "Trending" ranking (see lib/wordpress/trending.ts). Client-side so a page served from cache still counts a real per-visitor view. */
export function ViewTracker({ postId }: { postId: number }) {
  useEffect(() => {
    fetch(`/api/posts/${postId}/view`, { method: "POST" }).catch(() => {
      // Best-effort ranking signal, not something the reader depends on.
    });
  }, [postId]);

  return null;
}
