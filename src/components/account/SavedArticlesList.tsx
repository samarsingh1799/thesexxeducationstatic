"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getArticlePath } from "@/lib/seo/canonical";

type SavedArticle = { postId: number; slug: string; categorySlug: string | null; locale: string; title: string };

export function SavedArticlesList({ emptyLabel }: { emptyLabel: string }) {
  const [items, setItems] = useState<SavedArticle[] | null>(null);

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((res) => (res.ok ? (res.json() as Promise<{ items?: SavedArticle[] }>) : Promise.resolve({ items: [] })))
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (items.length === 0) return <p className="text-sm text-ink-muted">{emptyLabel}</p>;

  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item.postId}>
          <Link href={getArticlePath(item.locale, item.categorySlug ?? undefined, item.slug)} className="text-ink hover:text-accent hover:underline">
            {item.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
