"use client";

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 text-ink-muted">Please try again.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black">
        Try again
      </button>
    </div>
  );
}
