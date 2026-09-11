import Link from "next/link";

/** Disclosed-machine-translation banner, shown on every translated article page — Google's spam policies treat disclosed machine translation far more leniently than the same content published silently. */
export function TranslationNotice({ originalUrl }: { originalUrl: string }) {
  return (
    <div className="mb-6 rounded-md border border-border bg-gray-50 px-4 py-3 text-sm text-ink-muted">
      This article has been machine-translated from the English original.{" "}
      <Link href={originalUrl} className="font-semibold text-accent hover:underline">
        View original
      </Link>
      .
    </div>
  );
}
