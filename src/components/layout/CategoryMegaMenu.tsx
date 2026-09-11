"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CategoryWithChildren } from "@/types/content";

/**
 * Single-row horizontal slider category menu with smooth full-screen
 * sliding and prominent previous/next navigation controls — the dropdown
 * panel DesktopNav opens beneath the section-nav row.
 */
export function CategoryMegaMenu({ categories, locale }: { categories: CategoryWithChildren[]; locale: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    let isThrottled = false;
    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 8) return;
      e.preventDefault();
      if (isThrottled) return;
      isThrottled = true;
      el.scrollBy({ left: delta > 0 ? el.clientWidth : -el.clientWidth, behavior: "smooth" });
      setTimeout(() => {
        isThrottled = false;
      }, 450);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("scroll", checkScroll);
      el.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", checkScroll);
    };
  }, [categories]);

  const slideLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    scrollRef.current?.scrollBy({ left: -(scrollRef.current?.clientWidth ?? 0), behavior: "smooth" });
  };

  const slideRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    scrollRef.current?.scrollBy({ left: scrollRef.current?.clientWidth ?? 0, behavior: "smooth" });
  };

  if (categories.length === 0) {
    return <p className="p-4 text-sm opacity-70">No categories yet.</p>;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Browse Categories</span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={slideLeft}
            disabled={!canScrollLeft}
            aria-label="Previous categories"
            className={`flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3.5 py-1 text-xs font-semibold text-white transition-all ${
              canScrollLeft ? "cursor-pointer hover:border-accent hover:bg-accent hover:text-white opacity-100 shadow-sm active:scale-95" : "cursor-not-allowed opacity-25"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={slideRight}
            disabled={!canScrollRight}
            aria-label="Next categories"
            className={`flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3.5 py-1 text-xs font-semibold text-white transition-all ${
              canScrollRight ? "cursor-pointer hover:border-accent hover:bg-accent hover:text-white opacity-100 shadow-sm active:scale-95" : "cursor-not-allowed opacity-25"
            }`}
          >
            <span>Next</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-6 flex flex-nowrap overflow-x-auto scroll-smooth divide-x divide-white/10 pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category, index) => (
          <div key={category.slug} className={`w-1/4 min-w-[260px] shrink-0 snap-start ${index === 0 ? "pr-8 pl-0" : "px-8"}`}>
            <Link href={`/${locale}/category/${category.slug}`} className="block text-base font-bold uppercase tracking-wide text-white hover:text-accent transition-colors">
              {category.name}
            </Link>
            {category.children && category.children.length > 0 && (
              <ul className="mt-3.5 space-y-2.5">
                {category.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/${locale}/category/${child.slug}`}
                      className="block text-sm text-white/70 hover:text-accent hover:opacity-100 transition-colors"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
