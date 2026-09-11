"use client";

import { useEffect, useRef, useState } from "react";

const SIZES = [
  { label: "S", px: 15 },
  { label: "M", px: 17 },
  { label: "L", px: 19 },
  { label: "XL", px: 21 },
] as const;

const STORAGE_KEY = "article-font-size";
const DEFAULT_PX: number = SIZES[1].px;

function applySize(px: number) {
  document.documentElement.style.setProperty("--article-font-size", `${px}px`);
}

/** Scales the article body's type only, via the `--article-font-size` CSS variable ArticleBody's prose container reads. Persisted per-browser via localStorage. */
export function FontSizeControl() {
  const [px, setPx] = useState<number>(DEFAULT_PX);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let initial = DEFAULT_PX;
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY));
      if (SIZES.some((size) => size.px === stored)) initial = stored;
    } catch {
      // Private browsing / storage disabled — fall back to the default size.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPx(initial);
    applySize(initial);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function choose(next: number) {
    setPx(next);
    applySize(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Storage unavailable — the chosen size still applies for this page view.
    }
  }

  return (
    <div ref={containerRef} className="relative flex">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Text size"
        className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${isOpen ? "border-accent bg-accent text-white" : "border-border text-ink hover:border-accent hover:text-accent"}`}
      >
        <span className="font-serif text-lg font-bold leading-none">Aa</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 z-10 flex flex-col items-center gap-1 rounded-xl border border-border bg-white py-2 px-2 shadow-xl animate-drawer-in">
          <div className="absolute -top-1.5 right-[14px] h-3 w-3 rotate-45 border-l border-t border-border bg-white" />
          {SIZES.map((size) => (
            <button
              key={size.label}
              type="button"
              onClick={() => {
                choose(size.px);
                setIsOpen(false);
              }}
              aria-pressed={px === size.px}
              aria-label={`Text size ${size.label}`}
              className={`flex h-8 w-14 items-center justify-center rounded-md text-sm font-medium transition-colors ${px === size.px ? "bg-ink text-white" : "text-ink-muted hover:bg-accent-soft hover:text-ink"}`}
            >
              {size.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
