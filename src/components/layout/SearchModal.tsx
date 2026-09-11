"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchIcon, CloseIcon } from "./icons";
import { AdSlot } from "@/components/ads/AdSlot";
import type { Category, PostSummary } from "@/types/content";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  locale: string;
}

export function SearchModal({ isOpen, onClose, categories = [], locale }: SearchModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [popularPosts, setPopularPosts] = useState<PostSummary[]>([]);
  const [results, setResults] = useState<PostSummary[]>([]);
  const [lastFetchedQuery, setLastFetchedQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch("/api/search")
      .then((res) => (res.ok ? (res.json() as Promise<PostSummary[]>) : []))
      .then((data) => {
        if (!cancelled) setPopularPosts(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const isSearching = query.trim().length > 0;

  useEffect(() => {
    if (!isSearching) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) setResults((await res.json()) as PostSummary[]);
      } catch {
        // ignore — showLoading below just stops spinning
      } finally {
        setLastFetchedQuery(query);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, isSearching]);

  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  if (isOpen !== lastIsOpen) {
    setLastIsOpen(isOpen);
    if (isOpen) setIsMounted(true);
    else setIsVisible(false);
  }

  useEffect(() => {
    if (!isMounted || !isOpen) return;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(focusTimer);
  }, [isMounted, isOpen]);

  useEffect(() => {
    if (!isMounted || isVisible || isOpen) return;
    const timer = setTimeout(() => {
      setIsMounted(false);
      document.body.style.overflow = "";
      setQuery("");
    }, 300);
    return () => clearTimeout(timer);
  }, [isMounted, isVisible, isOpen]);

  useEffect(() => {
    if (!isMounted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, onClose]);

  if (!isMounted) return null;

  const showLoading = isSearching && lastFetchedQuery !== query;
  const displayedArticles = (isSearching ? results : popularPosts).slice(0, 6);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? "bg-black/60 opacity-100 pointer-events-auto" : "bg-black/0 opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div
        className={`relative flex w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl max-h-[90vh] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-lg hover:text-black transition-all cursor-pointer"
          aria-label="Close search"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="border-b border-border px-8 pb-4 pt-8">
          <form action={`/${locale}/search`} method="get" className="flex items-center gap-4">
            <SearchIcon className="h-6 w-6 text-ink-muted shrink-0" />
            <input
              ref={inputRef}
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-xl outline-none placeholder:text-ink-muted text-ink"
            />
            <button type="submit" className="text-sm font-semibold tracking-wide text-ink-muted hover:text-ink shrink-0 transition-colors">
              SEARCH &gt;
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-12 overflow-y-auto px-8 py-8 lg:flex-row">
          <div className="flex-1">
            <h3 className="mb-6 text-2xl font-bold text-ink">{query.trim() ? "Search Results" : "Popular Reads"}</h3>

            {showLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-ink-muted">Searching articles…</div>
            ) : displayedArticles.length === 0 ? (
              <p className="py-8 text-sm text-ink-muted">{query.trim() ? `No articles found matching "${query}".` : "No articles available."}</p>
            ) : (
              <div className="flex flex-col gap-6">
                {displayedArticles.map((article) => {
                  const href = `/${locale}/${article.category?.slug ?? "article"}/${article.slug}`;
                  return (
                    <Link key={article.id} href={href} onClick={onClose} className="group flex items-start gap-4">
                      <div className="relative h-16 w-16 sm:h-18 sm:w-18 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {article.featuredImage ? (
                          <Image
                            src={article.featuredImage.url}
                            alt={article.featuredImage.alt || article.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 640px) 64px, 80px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-accent-soft text-accent-dark font-bold text-[10px]">
                            {article.category?.name?.slice(0, 2).toUpperCase() || "ART"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {article.category && <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">{article.category.name}</p>}
                        <h4 className="mt-1 text-base sm:text-md font-bold leading-snug text-ink group-hover:underline line-clamp-2">{article.title}</h4>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-6">
            {categories.length > 0 && (
              <div>
                <h3 className="mb-6 text-2xl font-bold text-ink">Popular Keywords</h3>
                <div className="flex flex-wrap gap-3">
                  {categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/${locale}/category/${category.slug}`}
                      onClick={onClose}
                      className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="hidden lg:block mt-2">
              <AdSlot slotId="search-modal" label="Advertisement" minHeight={250} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
