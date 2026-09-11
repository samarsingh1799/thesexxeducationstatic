"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function ForgotPasswordForm({ dictionary }: { dictionary?: Dictionary } = {}) {
  const locale = useCurrentLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    await authClient.requestPasswordReset({ email, redirectTo: `/${locale.code}/reset-password` });
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-border bg-accent-soft p-4 text-sm text-ink">
          If an account exists for that email, we&rsquo;ve sent a link to reset your password. It may take a few minutes to arrive.
        </p>
        <p className="text-center text-sm text-ink-muted">
          <Link href={`/${locale.code}/login`} className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink">
          {dictionary?.email ?? "Email"}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : (dictionary?.resetPassword ?? "Send reset link")}
      </button>

      <p className="text-center text-sm text-ink-muted">
        <Link href={`/${locale.code}/login`} className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
