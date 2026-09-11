import Link from "next/link";

type PaginationNavProps = {
  basePath: string;
  page: number;
  totalPages: number;
  previousLabel: string;
  nextLabel: string;
  /** Template with {page}/{totalPages} placeholders, e.g. "Page {page} of {totalPages}" */
  pageOfTemplate: string;
};

function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

/**
 * Pure, hook-free rendering of the pagination nav for a known `page` —
 * factored out of Pagination.tsx so the exact same markup can be rendered
 * both server-side (with `page` hardcoded to 1, as the <Suspense> fallback
 * in the category/tag/author route files — see Pagination.tsx) and
 * client-side (with the real page read from the URL).
 */
export function PaginationNav({ basePath, page, totalPages, previousLabel, nextLabel, pageOfTemplate }: PaginationNavProps) {
  if (totalPages <= 1) return null;

  const pageOfLabel = pageOfTemplate.replace("{page}", String(page)).replace("{totalPages}", String(totalPages));

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
