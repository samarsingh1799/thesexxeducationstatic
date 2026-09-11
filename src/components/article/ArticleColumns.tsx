import type { SplitSectionsResult } from "@/lib/content/splitSections";

const GRID_COLS: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

/**
 * The magazine-style multi-column article body: each top-level `<h2>`
 * section renders as its own column, with monospace body copy for the
 * typewriter look.
 */
export function ArticleColumns({ introHtml, sections }: SplitSectionsResult) {
  return (
    <div>
      {introHtml.trim() && (
        <div
          className="prose prose-gray max-w-none prose-a:text-ink prose-a:underline"
          style={{ fontSize: "var(--article-font-size, 17px)" }}
          dangerouslySetInnerHTML={{ __html: introHtml }}
        />
      )}

      <div className={`mt-6 grid grid-cols-1 gap-x-8 gap-y-10 ${GRID_COLS[sections.length]}`}>
        {sections.map((section) => (
          <div
            key={section.id}
            className="prose prose-sm max-w-none font-mono prose-headings:font-sans prose-headings:text-lg prose-headings:font-bold prose-headings:tracking-tight prose-a:text-ink prose-a:underline"
            style={{ fontSize: "var(--article-font-size, 17px)" }}
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        ))}
      </div>
    </div>
  );
}
