import type { TocHeading } from "@/lib/content/toc";

type TableOfContentsProps = { headings: TocHeading[]; className?: string };

export function TableOfContents({ headings, className }: TableOfContentsProps) {
  if (headings.length === 0) return null;

  return (
    <details className={`rounded-md border border-border p-4 ${className ?? ""}`}>
      <summary className="cursor-pointer">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden="true" className="h-3 w-1 bg-accent" />
          Contents
        </span>
      </summary>
      <nav aria-label="Table of contents" className="mt-3">
        <ul className="space-y-2 border-l border-border text-sm">
          {headings.map((heading) => (
            <li key={heading.id} className={heading.level === 3 ? "pl-8" : "pl-4"}>
              <a
                href={`#${heading.id}`}
                className="text-ink-muted transition-colors hover:text-accent hover:underline"
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
