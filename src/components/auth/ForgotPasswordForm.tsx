"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function ForgotPasswordForm({ dictionary }: { dictionary: Dictionary }) {
  const locale = useCurrentLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    await authClient.requestPasswordReset({ email, redirectTo: `/${locale.code}/reset-password` });
    // Always show the same confirmation regardless of whether the email
    // exists — an account-enumeration leak is not worth the marginal UX
    // gain of a more specific error.
    setStatus("sent");
  }

  if (status === "sent") {
    return <p className="text-sm text-ink-muted">If an account exists for that email, a reset link is on its way.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          {dictionary.email}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
      >
        {dictionary.resetPassword}
      </button>
    </form>
  );
}
