"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { siteConfig } from "@/lib/seo/site-config";
import type { CategoryWithChildren } from "@/types/content";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import { MenuIcon, CloseIcon, SearchIcon, ChevronDownIcon } from "./icons";
import { SearchModal } from "./SearchModal";

export function MobileNav({ categories, latestLabel }: { categories: CategoryWithChildren[]; latestLabel: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const locale = useCurrentLocale();

  function openMenu() {
    setIsMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
  }

  function closeMenu() {
    setIsVisible(false);
  }

  useEffect(() => {
    if (!isMounted || isVisible) return;
    const timeout = setTimeout(() => setIsMounted(false), 500);
    return () => clearTimeout(timeout);
  }, [isMounted, isVisible]);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsVisible(false);
  }

  useEffect(() => {
    if (!isMounted) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMounted]);

  async function handleSignOut() {
    closeMenu();
    await authClient.signOut();
    router.push(`/${locale.code}`);
    router.refresh();
  }

  function toggleCategory(slug: string) {
    setExpandedCategories((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={isMounted ? "Close menu" : "Open menu"}
        aria-expanded={isMounted}
        onClick={openMenu}
        className="flex h-9 w-9 items-center justify-center p-1 text-ink transition-colors hover:text-accent"
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      {isMounted && (
        <div
          role="dialog"
          aria-label="Navigation Menu"
          aria-modal="true"
          className={`fixed inset-0 z-50 flex h-dvh w-screen flex-col bg-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full"
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5 sm:px-6">
            <Link href={`/${locale.code}`} onClick={closeMenu} className="font-serif text-2xl font-bold text-ink tracking-tight">
              {siteConfig.name}
            </Link>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink hover:bg-gray-100 hover:text-accent transition-colors"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6 space-y-6 divide-y divide-border">
            <div className="space-y-1.5">
              <Link
                href={`/${locale.code}`}
                onClick={closeMenu}
                className="flex items-center rounded-xl px-4 py-3 text-base font-semibold text-ink hover:bg-gray-50 transition-colors"
              >
                Home
              </Link>
              <Link
                href={`/${locale.code}/latest`}
                onClick={closeMenu}
                className="flex items-center rounded-xl px-4 py-3 text-base font-semibold text-ink hover:bg-gray-50 transition-colors"
              >
                {latestLabel}
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  setIsSearchOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold text-ink hover:bg-gray-50 transition-colors"
              >
                <SearchIcon className="h-4 w-4" />
                Search
              </button>
            </div>

            <div className="pt-6">
              <div className="mb-3 px-4 text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">Explore Categories</div>
              <div className="space-y-1">
                {categories.map((category) => {
                  const isExpanded = Boolean(expandedCategories[category.slug]);
                  const hasChildren = Boolean(category.children && category.children.length > 0);

                  return (
                    <div key={category.slug} className="rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors">
                        <Link
                          href={`/${locale.code}/category/${category.slug}`}
                          onClick={closeMenu}
                          className="flex-1 text-base font-semibold text-ink hover:text-accent transition-colors"
                        >
                          {category.name}
                        </Link>
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={() => toggleCategory(category.slug)}
                            aria-label={`Toggle ${category.name} subcategories`}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-gray-100 hover:text-ink transition-colors"
                          >
                            <ChevronDownIcon
                              className={`h-4 w-4 transition-transform duration-300 ${
                                isExpanded ? "rotate-180 text-accent" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {hasChildren && (
                        <div
                          className={`grid transition-[grid-template-rows,opacity] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="ml-6 pl-4 border-l-2 border-border/80 my-1.5 space-y-1">
                              {category.children.map((child) => (
                                <Link
                                  key={child.slug}
                                  href={`/${locale.code}/category/${child.slug}`}
                                  onClick={closeMenu}
                                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-muted hover:text-accent hover:bg-gray-50 transition-colors"
                                >
                                  {child.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 pb-12">
              <div className="mb-3 px-4 text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">Your Account</div>
              {session ? (
                <div className="space-y-1">
                  <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow-sm">
                      {session.user.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{session.user.name}</p>
                      <p className="truncate text-xs text-ink-muted">{session.user.email}</p>
                    </div>
                  </div>
                  <Link
                    href={`/${locale.code}/account`}
                    onClick={closeMenu}
                    className="block rounded-xl px-4 py-2.5 text-sm font-medium text-ink hover:bg-gray-50 transition-colors"
                  >
                    My Account
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 px-2 pt-1 pb-3">
                  <Link
                    href={`/${locale.code}/login`}
                    onClick={closeMenu}
                    className="flex items-center justify-center rounded-xl border border-border py-3 text-sm font-semibold text-ink hover:border-accent hover:text-accent transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href={`/${locale.code}/register`}
                    onClick={closeMenu}
                    className="flex items-center justify-center rounded-xl bg-black py-3 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} categories={categories} locale={locale.code} />
    </div>
  );
}
