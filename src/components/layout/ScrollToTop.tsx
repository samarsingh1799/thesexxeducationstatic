"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 350);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={cn(
        "fixed bottom-4 right-4 sm:bottom-10 sm:right-10 z-40",
        "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full",
        "bg-accent text-white shadow-2xl border border-white/20",
        "transition-all duration-300 ease-out hover:bg-accent hover:scale-105 active:scale-95",
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6">
        <path
          fillRule="evenodd"
          d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
