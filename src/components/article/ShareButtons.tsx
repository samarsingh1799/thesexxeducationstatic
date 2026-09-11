"use client";

import { useEffect, useRef, useState } from "react";
import { FaXTwitter, FaFacebookF, FaWhatsapp, FaLinkedinIn, FaEnvelope } from "react-icons/fa6";
import { IoShareSocialOutline } from "react-icons/io5";
import { CopyLinkButton } from "./CopyLinkButton";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
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

  return (
    <div ref={containerRef} className="relative flex" aria-label="Share this article">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Share"
        className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${isOpen ? "border-accent bg-accent text-white" : "border-border text-ink hover:border-accent hover:text-accent"}`}
      >
        <IoShareSocialOutline className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 z-20 flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white py-2 px-1 shadow-xl animate-drawer-in">
          <div className="absolute -top-1.5 right-[14px] h-3 w-3 rotate-45 border-l border-t border-border bg-white" />

          <a href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className="flex h-7.5 w-7.5 items-center justify-center text-ink-muted hover:text-[#25D366] transition-colors">
            <FaWhatsapp className="h-[17px] w-[17px]" />
          </a>
          <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X" className="flex h-7.5 w-7.5 items-center justify-center text-ink-muted hover:text-ink transition-colors">
            <FaXTwitter className="h-[16px] w-[16px]" />
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className="flex h-7.5 w-7.5 items-center justify-center text-ink-muted hover:text-[#1877F2] transition-colors">
            <FaFacebookF className="h-[16px] w-[16px]" />
          </a>
          <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" className="flex h-7.5 w-7.5 items-center justify-center text-ink-muted hover:text-[#0A66C2] transition-colors">
            <FaLinkedinIn className="h-[16px] w-[16px]" />
          </a>
          <a href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`} aria-label="Share by email" className="flex h-7.5 w-7.5 items-center justify-center text-ink-muted hover:text-ink transition-colors">
            <FaEnvelope className="h-[16px] w-[16px]" />
          </a>

          <div className="mt-0.5 border-t border-border/60 pt-1">
            <CopyLinkButton url={url} size="sm" />
          </div>
        </div>
      )}
    </div>
  );
}
