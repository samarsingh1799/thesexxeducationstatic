"use client";

import { useEffect, useState } from "react";

/**
 * Small decorative masthead detail — the visitor's own local date/time, not
 * a fabricated "live" server value. Rendering this from a Server Component
 * would bake a single snapshot into the cached HTML and go stale until the
 * next revalidation (and, at day boundaries, show the wrong date entirely),
 * so it's a tiny self-contained client island instead, refreshed every
 * minute. No invented timezone label — `toLocaleString` reports whatever
 * the visitor's own device is actually set to.
 */
export function DateTimeBadge({ className }: { className?: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const date = now.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
      const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      setLabel(`${date} · ${time}`);
    };

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span aria-hidden="true" className={className}>
      {label ?? " "}
    </span>
  );
}
