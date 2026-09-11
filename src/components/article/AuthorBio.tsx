import Image from "next/image";
import Link from "next/link";
import type { Author } from "@/types/content";

export function AuthorBio({ author, locale }: { author: Author; locale: string }) {
  return (
    <div className="flex flex-col items-center sm:flex-row sm:items-start text-center sm:text-left gap-4 rounded-xl border border-border p-6">
      {author.avatarUrl ? (
        <Image
          src={author.avatarUrl}
          alt=""
          width={64}
          height={64}
          className="rounded-full object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-lg font-bold text-accent-dark">
          {author.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Written by
        </h2>
        <p className="mt-1 text-lg font-semibold text-ink">
          {author.slug ? (
            <Link href={`/${locale}/author/${author.slug}`} className="hover:underline">
              {author.name}
            </Link>
          ) : (
            author.name
          )}
        </p>
        {author.bio && <p className="mt-2 text-sm text-ink-muted">{author.bio}</p>}
      </div>
    </div>
  );
}
