"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import { SocialSignInButtons } from "@/components/auth/SocialSignInButtons";
import type { Dictionary } from "@/lib/i18n/dictionary";

type Status = "idle" | "submitting" | "error";

export function SignUpForm({
  dictionary,
  onSigninClick,
}: {
  dictionary?: Dictionary;
  onSigninClick?: () => void;
} = {}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useCurrentLocale();

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

    // Honeypot check
    if (data.get("website")) {
      setStatus("idle");
      return;
    }

    const name = data.get("name") as string;
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    const confirmPassword = data.get("confirmPassword") as string;
    const acceptedTerms = data.get("acceptedTerms") === "on";

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setStatus("error");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms & Conditions and Privacy Policy.");
      setStatus("error");
      return;
    }

    try {
      const { error: signUpError } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message ?? "Could not create your account.");
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

  const signinHref = `/${locale.code}/login`;

  return (
    <div className="space-y-5">
      <SocialSignInButtons redirectPath={redirectPath} action={action} />

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink-muted">
        <span className="h-px flex-1 bg-border" />
        Or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Honeypot */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

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
          <label htmlFor="password" className="text-sm font-medium text-ink">
            {dictionary?.password ?? "Password"}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <p className="mt-1 text-xs text-ink-muted">At least 8 characters.</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-ink-muted cursor-pointer">
          <input type="checkbox" name="newsletterOptIn" className="mt-0.5 h-4 w-4 rounded border-border text-ink" />
          Send me new articles by email. You can unsubscribe anytime.
        </label>

        <label className="flex items-start gap-2 text-sm text-ink-muted cursor-pointer">
          <input type="checkbox" name="acceptedTerms" required className="mt-0.5 h-4 w-4 rounded border-border text-ink" />
          <span>
            I agree to the{" "}
            <Link href={`/${locale.code}/terms-and-conditions`} className="text-accent hover:underline">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href={`/${locale.code}/privacy-policy`} className="text-accent hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
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
          {status === "submitting" ? "Creating account…" : (dictionary?.createAccount ?? "Create account")}
        </button>

        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          {onSigninClick ? (
            <button
              type="button"
              onClick={onSigninClick}
              className="font-medium text-accent hover:underline"
            >
              {dictionary?.signIn ?? "Sign in"}
            </button>
          ) : (
            <Link href={signinHref} className="font-medium text-accent hover:underline">
              {dictionary?.signIn ?? "Sign in"}
            </Link>
          )}
        </p>
      </form>
    </div>
  );
}
