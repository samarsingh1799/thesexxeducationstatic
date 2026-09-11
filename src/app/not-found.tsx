/**
 * Only reached for a URL with no matching `[locale]` segment at all
 * (e.g. a bare unsupported path) — every real link on the site is always
 * locale-prefixed, so this is a rare fallback, not the common 404 case
 * (see app/[locale]/not-found.tsx for that, which uses the visitor's own
 * locale). Defines its own <html>/<body> because there's no root
 * app/layout.tsx — the real root layout lives at app/[locale]/layout.tsx.
 */
import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 448, margin: "6rem auto", padding: "0 1rem", textAlign: "center" }}>
          <h1>Page not found</h1>
          <p>
            <Link href="/en">Go to the homepage</Link>
          </p>
        </div>
      </body>
    </html>
  );
}
