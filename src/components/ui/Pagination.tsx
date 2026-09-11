"use client";

import { useSearchParams } from "next/navigation";
import { PaginationNav } from "./PaginationNav";

type PaginationProps = {
  basePath: string;
  totalPages: number;
  previousLabel: string;
  nextLabel: string;
  /** Template with {page}/{totalPages} placeholders, e.g. "Page {page} of {totalPages}" */
  pageOfTemplate: string;
};

/**
 * Reads the current page from the URL client-side (`useSearchParams`)
 * rather than being told via a server-computed prop — the category/tag/
 * author pages that render this no longer read `searchParams` server-side
 * at all (see PaginatedPostGrid.tsx). Must always be rendered inside a
 * <Suspense> boundary whose fallback is <PaginationNav page={1} .../> —
 * that fallback, not this component, is what actually ends up in the
 * cached/ISR'd HTML; this only runs after hydration, in the browser.
 */
export function Pagination({ basePath, totalPages, previousLabel, nextLabel, pageOfTemplate }: PaginationProps) {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  return (
    <PaginationNav
      basePath={basePath}
      page={page}
      totalPages={totalPages}
      previousLabel={previousLabel}
      nextLabel={nextLabel}
      pageOfTemplate={pageOfTemplate}
    />
  );
}
