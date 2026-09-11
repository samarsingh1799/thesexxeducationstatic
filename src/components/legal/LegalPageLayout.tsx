import type { ReactNode } from "react";

export function LegalPageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink">{title}</h1>
      <div className="prose prose-neutral mt-8 max-w-none prose-headings:font-semibold prose-a:text-accent">{children}</div>
    </div>
  );
}
