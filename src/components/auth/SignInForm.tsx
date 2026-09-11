"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";
import type { Dictionary } from "@/lib/i18n/dictionary";

type Status = "idle" | "submitting" | "error";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Something went wrong while signing you in. Please try again.",
  oauth_cancelled: "Sign-in was cancelled.",
  email_exists:
    "An account already exists for this email. Sign in below with your usual method, then connect this provider from Settings.",
};

export function SignInForm({
  dictionary,
  onSignupClick,
}: {
  dictionary?: Dictionary;
  onSignupClick?: () => void;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useCurrentLocale();
  const authError = searchParams.get("authError");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(
    authError ? (AUTH_ERROR_MESSAGES[authError] ?? null) : null
  );

  const redirectCandidate = searchParams.get("redirect");
  const fallbackRedirect = `/${locale.code}/account`;
  const redirectPath =
    redirectCandidate && redirectCandidate.startsWith(`/${locale.code}`)
      ? redirectCandidate
      : fallbackRedirect;
  const action = searchParams.get("action");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    const rememberMe = data.get("rememberMe") === "on";

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
      });

      if (signInError) {
        setError(signInError.message ?? "Invalid email or password.");
        setStatus("error");
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  const forgotPasswordHref = `/${locale.code}/forgot-password`;
  const registerHref = `/${locale.code}/register`;

  return (
    <div className="space-y-5">
      <SocialSignInButtons redirectPath={redirectPath} action={action} />

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink-muted">
        <span className="h-px flex-1 bg-border" />
        Or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink">
            {dictionary?.email ?? "Email"}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              {dictionary?.password ?? "Password"}
            </label>
            <Link href={forgotPasswordHref} className="text-sm text-accent hover:underline">
              {dictionary?.forgotPassword ?? "Forgot password?"}
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
          <input type="checkbox" name="rememberMe" className="h-4 w-4 rounded border-border text-ink" />
          Remember me
        </label>

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
          {status === "submitting" ? "Signing in…" : (dictionary?.signIn ?? "Sign in")}
        </button>

        <p className="text-center text-sm text-ink-muted">
          Don&rsquo;t have an account?{" "}
          {onSignupClick ? (
            <button
              type="button"
              onClick={onSignupClick}
              className="font-medium text-accent hover:underline"
            >
              {dictionary?.signUp ?? "Sign up"}
            </button>
          ) : (
            <Link href={registerHref} className="font-medium text-accent hover:underline">
              {dictionary?.signUp ?? "Sign up"}
            </Link>
          )}
        </p>
      </form>
    </div>
  );
}
