"use client";

/** Catches an error thrown in the root layout itself (rare) — must supply its own <html>/<body> since it replaces the entire tree, root layout included. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 448, margin: "6rem auto", padding: "0 1rem", textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
