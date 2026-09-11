"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import type { Dictionary } from "@/lib/i18n/dictionary";

type Status = "idle" | "submitting" | "error" | "success";

export function ResetPasswordForm({ dictionary }: { dictionary?: Dictionary } = {}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();
  const locale = useCurrentLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          This reset link is invalid or has expired. Please request a new one.
        </p>
        <p className="text-center text-sm text-ink-muted">
          <Link href={`/${locale.code}/forgot-password`} className="font-medium text-accent hover:underline">
            Request new reset link
          </Link>
        </p>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setStatus("error");
      return;
    }

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token: token as string,
      });

      if (resetError) {
        setError(resetError.message ?? "This link is invalid or has expired.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setTimeout(() => router.push(`/${locale.code}/login`), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="rounded-md border border-border bg-accent-soft p-4 text-sm text-ink">
        Your password has been reset. Redirecting you to sign in…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <p className="mt-1 text-xs text-ink-muted">At least 8 characters.</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
      >
        {status === "submitting" ? "Resetting…" : (dictionary?.resetPassword ?? "Reset password")}
      </button>

      <p className="text-center text-sm text-ink-muted">
        <Link href={`/${locale.code}/login`} className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
