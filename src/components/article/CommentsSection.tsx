"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { buildAuthModalUrl } from "@/lib/auth/authModal";
import type { Comment } from "@/types/comment";

type Dictionary = {
  comments: string;
  noCommentsYet: string;
  signInToComment: string;
  signIn: string;
  writeCommentPlaceholder: string;
  postComment: string;
  postingComment: string;
  commentError: string;
};

type Props = {
  postId: number;
  locale: string;
  /** For the "sign in, then come back here" redirect — the article's own canonical path. */
  articlePath: string;
  dictionary: Dictionary;
};

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Client-rendered end to end — deliberately never baked into the article
 * page's own server-rendered/ISR-cached HTML. That page is cached
 * indefinitely until the WordPress webhook invalidates it (see
 * app/[locale]/[category]/[slug]/page.tsx), which has nothing to do with
 * when a reader posts a comment; embedding live comment data in that
 * cached render would mean a new comment never appears to other visitors
 * until an unrelated WordPress edit happens to revalidate the page. Same
 * reasoning, same fix shape, as SaveArticleButton/LikeArticleButton
 * (client-side state, session-aware, never part of the cached page).
 *
 * Renders only the list + form — deliberately NOT the "COMMENTS" section
 * heading, which the article page renders itself as static, always-visible
 * chrome. That split matters: this component reads `useSearchParams()`
 * (for the post-sign-in "resume to comment box" behavior), which requires
 * a <Suspense> boundary around it in the parent (see the article page's
 * own comment on this) — and unlike PaginatedPostGrid's page-1 data, there
 * is no server-known comments data to put in that Suspense fallback, so
 * the fallback is honestly a loading skeleton. Keeping the heading outside
 * this component means it's still in the cached HTML even while this part
 * is loading/hydrating.
 */
export function CommentsSection({ postId, locale, articlePath, dictionary }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Returning from the sign-in modal with ?action=comment (see
  // buildAuthModalUrl): scroll to and focus the textarea so the reader can
  // continue right where they left off, then clean the URL so a refresh
  // doesn't repeat it.
  useEffect(() => {
    if (!session || searchParams.get("action") !== "comment") return;

    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    textareaRef.current?.focus();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/comments/${postId}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ items?: Comment[] }>) : null))
      .then((data) => {
        if (!cancelled) setComments(data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch(`/api/comments/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = (await res.json()) as Comment & { error?: string };

      if (!res.ok) {
        setError(body.error ?? dictionary.commentError);
        setStatus("idle");
        return;
      }

      setComments((current) => [...(current ?? []), body]);
      setContent("");
      setStatus("idle");
    } catch {
      setError(dictionary.commentError);
      setStatus("idle");
    }
  }

  return (
    <>
      {comments === null ? (
        <div aria-hidden="true" className="mt-6 h-16 animate-pulse rounded-md bg-gray-100" />
      ) : comments.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">{dictionary.noCommentsYet}</p>
      ) : (
        <ul className="mt-6 space-y-6">
          {comments.map((comment) => (
            <li key={comment.id} className="border-b border-border pb-6 last:border-b-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-ink">{comment.authorName}</span>
                <time dateTime={comment.createdAt} className="text-xs text-ink-muted">
                  {formatDate(comment.createdAt, locale)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{comment.content}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        {isPending ? (
          <div aria-hidden="true" className="h-24 animate-pulse rounded-md border border-border bg-gray-50" />
        ) : !session ? (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-ink-muted">{dictionary.signInToComment}</p>
            <button
              type="button"
              onClick={() => router.push(buildAuthModalUrl(articlePath, "comment"), { scroll: false })}
              className="mt-3 rounded-md bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              {dictionary.signIn}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="comment-content" className="sr-only">
              {dictionary.writeCommentPlaceholder}
            </label>
            <textarea
              ref={textareaRef}
              id="comment-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              minLength={2}
              maxLength={3000}
              rows={4}
              placeholder={dictionary.writeCommentPlaceholder}
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />

            {error && (
              <p role="alert" aria-live="polite" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="rounded-md bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              {status === "submitting" ? dictionary.postingComment : dictionary.postComment}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
