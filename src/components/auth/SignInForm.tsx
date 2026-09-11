"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function SignInForm({ dictionary }: { dictionary: Dictionary }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useCurrentLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await authClient.signIn.email({ email, password });
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message ?? "Invalid email or password.");
      return;
    }
    const redirect = searchParams.get("redirect");
    router.push(redirect && redirect.startsWith(`/${locale.code}`) ? redirect : `/${locale.code}/account`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
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
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          {dictionary.password}
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
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
        {dictionary.signIn}
      </button>
      <div className="flex justify-between text-sm">
        <Link href={`/${locale.code}/forgot-password`} className="text-ink-muted hover:text-accent">
          {dictionary.forgotPassword}
        </Link>
        <Link href={`/${locale.code}/register`} className="text-ink-muted hover:text-accent">
          {dictionary.createAccount}
        </Link>
      </div>
    </form>
  );
}
