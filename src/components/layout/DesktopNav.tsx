"use client";

import { useState, type FocusEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CategoryWithChildren } from "@/types/content";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import { CategoryMegaMenu } from "./CategoryMegaMenu";
import { SearchButton } from "./SearchButton";
import { ChevronDownIcon } from "./icons";

const MAX_VISIBLE_CATEGORIES = 6;

export function DesktopNav({ categories, latestLabel }: { categories: CategoryWithChildren[]; latestLabel: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const locale = useCurrentLocale();
  const visibleCategories = categories.slice(0, MAX_VISIBLE_CATEGORIES);
  const navLinkClass = "text-sm font-medium tracking-wide text-white transition-colors hover:text-accent";

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
    }
  }

  return (
    <nav aria-label="Primary" className="hidden items-center justify-between lg:flex">
      {/* min-w-0 lets the scrollable strip below actually shrink/scroll instead of
          stretching this whole row wider than the header — a flex item's default
          min-width is "auto" (its content size), which would otherwise silently
          disable the child's own overflow-x-auto entirely. */}
      <div className="flex min-w-0 items-center gap-8">
        {/* Kept OUTSIDE the scrollable strip, and never shrinks (shrink-0): its
            mega-menu panel is `absolute`, positioned against the sticky <header>
            (see the comment below), and an overflow-x-auto ancestor would clip
            it — CSS forces overflow-y to "auto" too the moment overflow-x isn't
            "visible", so nesting this inside the scroller would cut the panel
            off vertically as well as horizontally. */}
        {/* No `relative` on this trigger wrapper: the panel anchors to the nearest positioned ancestor, the sticky <header>, so top-full docks it below the whole two-row header. */}
        <div
          className="flex shrink-0"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
        >
          <button type="button" className={`${navLinkClass} flex items-center gap-1`}>
            Categories
            <ChevronDownIcon className="h-3.5 w-3.5" />
          </button>

          <div
            className={`absolute inset-x-0 top-full z-40 rounded-b-xl border-b border-white/10 bg-black text-white shadow-2xl transition-[visibility,opacity] duration-150 ${
              open ? "visible opacity-100" : "invisible opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto max-w-7xl px-6 py-6">
              <CategoryMegaMenu categories={categories} locale={locale.code} />
            </div>
          </div>
        </div>

        {/* Latest + category links: never compressed (shrink-0 + whitespace-nowrap
            on each), scrolls horizontally instead when there isn't room — same
            technique as SiteHeader's mobile "Quick categories" pill bar. */}
        <div className="flex min-w-0 items-center gap-8 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={`/${locale.code}/latest`} className={`${navLinkClass} shrink-0 whitespace-nowrap`}>
            {latestLabel}
          </Link>
          {visibleCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/${locale.code}/category/${category.slug}`}
              className={`${navLinkClass} shrink-0 whitespace-nowrap`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>

      <SearchButton className="ml-6 shrink-0 text-white hover:text-accent" categories={categories} locale={locale.code} />
    </nav>
  );
}
