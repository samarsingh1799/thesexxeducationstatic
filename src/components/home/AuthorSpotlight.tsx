import Image from "next/image";
import Link from "next/link";
import type { Author } from "@/types/content";

export function AuthorSpotlight({ authors, locale }: { authors: Author[]; locale: string }) {
  if (authors.length === 0) return null;

  return (
    <section aria-labelledby="contributors-heading" className="border-t border-border py-10">
      <h2 id="contributors-heading" className="text-2xl font-bold text-ink md:text-3xl">
        Meet Our Contributors
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {authors.map((author) => (
          <div key={author.id} className="rounded-xl border border-border p-6 text-center">
            {author.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt=""
                width={72}
                height={72}
                className="mx-auto rounded-full object-cover"
              />
            ) : (
              <span className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-accent-soft text-xl font-bold text-accent-dark">
                {author.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <p className="mt-4 text-lg font-semibold text-ink">
              {author.slug ? (
                <Link href={`/${locale}/author/${author.slug}`} className="hover:underline">
                  {author.name}
                </Link>
              ) : (
                author.name
              )}
            </p>
            {author.bio && (
              <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{author.bio}</p>
            )}
            {author.slug && (
              <Link
                href={`/${locale}/author/${author.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-accent hover:text-accent-dark hover:underline"
              >
                View articles →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
