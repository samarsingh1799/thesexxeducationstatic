"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SearchIcon } from "./icons";
import type { Category } from "@/types/content";

// Code-split out of the header's bundle (mounted on every page) — only
// needed once someone actually clicks the search button.
const SearchModal = dynamic(() => import("./SearchModal").then((mod) => mod.SearchModal), { ssr: false });

interface SearchButtonProps {
  className?: string;
  categories?: Category[];
  locale: string;
}

export function SearchButton({ className, categories = [], locale }: SearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search"
        className={`inline-flex items-center justify-center gap-1.5 p-1 text-sm font-medium transition-colors hover:text-accent cursor-pointer ${className || "text-ink"}`}
      >
        <SearchIcon className="h-5 w-5 lg:h-4 lg:w-4" />
        <span className="hidden lg:inline">Search</span>
      </button>

      <SearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} categories={categories} locale={locale} />
    </>
  );
}
