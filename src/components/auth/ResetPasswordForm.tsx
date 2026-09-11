"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function ResetPasswordForm({ dictionary }: { dictionary: Dictionary }) {
  const router = useRouter();
  const locale = useCurrentLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    return <p className="text-sm text-red-700">This reset link is invalid or has expired. Request a new one.</p>;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token: token as string });
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message ?? "This link is invalid or has expired.");
      return;
    }
    router.push(`/${locale.code}/login`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          New {dictionary.password.toLowerCase()}
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
      >
        {dictionary.resetPassword}
      </button>
    </form>
  );
}
