"use client";

import { useState } from "react";
import { FaLink, FaCheck } from "react-icons/fa6";

export function CopyLinkButton({ url, size = "sm" }: { url: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);
  const isSmall = size === "sm";

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard API unavailable — silently ignore, nothing to recover.
          }
        }}
        aria-label={copied ? "Link copied" : "Copy link"}
        className={`flex items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-accent hover:text-accent-dark ${isSmall ? "h-7 w-7" : "h-10 w-10"}`}
      >
        {copied ? <FaCheck className={isSmall ? "h-3 w-3 text-accent" : "h-4 w-4 text-accent"} /> : <FaLink className={isSmall ? "h-3 w-3" : "h-4 w-4"} />}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </>
  );
}
