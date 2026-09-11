import Link from "next/link";

export function Breadcrumbs({ items }: { items: Array<{ name: string; href: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {index === items.length - 1 ? (
              <span aria-current="page" className="font-medium text-ink">
                {item.name}
              </span>
            ) : (
              <>
                <Link href={item.href} className="hover:text-accent hover:underline">
                  {item.name}
                </Link>
                <span aria-hidden="true">/</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
