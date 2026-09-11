import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";

type PaginationProps = {
  basePath: string;
  page: number;
  totalPages: number;
  locale?: string;
};

function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

export function Pagination({ basePath, page, totalPages, locale }: PaginationProps) {
  if (totalPages <= 1) return null;

  const previousLabel = "← Previous";
  const nextLabel = "Next →";
  const pageOfLabel = `Page ${page} of ${totalPages}`;

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-6 text-sm">
      {page > 1 ? (
        <Link
          href={pageHref(basePath, page - 1)}
          rel="prev"
          className="font-semibold text-accent hover:text-accent-dark hover:underline"
        >
          {previousLabel}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      <span className="text-ink-muted">{pageOfLabel}</span>
      {page < totalPages ? (
        <Link
          href={pageHref(basePath, page + 1)}
          rel="next"
          className="font-semibold text-accent hover:text-accent-dark hover:underline"
        >
          {nextLabel}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
