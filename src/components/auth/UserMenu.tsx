"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";
import type { Dictionary } from "@/lib/i18n/dictionary";

const linkClass = "text-sm font-medium tracking-wide text-ink transition-colors hover:text-accent";

export function UserMenu({ dictionary }: { dictionary?: Dictionary } = {}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const locale = useCurrentLocale();

  async function handleSignOut() {
    await authClient.signOut();
    router.push(`/${locale.code}`);
    router.refresh();
  }

  if (isPending) {
    return (
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="h-5 w-14 animate-pulse rounded bg-gray-100 hidden sm:inline-block" />
        <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100 hidden sm:inline-block" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href={`/${locale.code}/login`} className={`${linkClass} hidden sm:inline`}>
          {dictionary?.signIn ?? "Sign In"}
        </Link>
        <Link
          href={`/${locale.code}/register`}
          className="hidden sm:inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-black shadow-sm"
        >
          {dictionary?.signUp ?? "Sign Up"}
        </Link>
      </div>
    );
  }

  const user = session.user;
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
  const firstName = user.name ? user.name.split(" ")[0] : "Account";

  return (
    <div className="group relative flex">
      <button type="button" className={`${linkClass} flex items-center gap-2`}>
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-dark border border-accent/20"
        >
          {initial}
        </span>
        <span className="hidden sm:inline font-medium">{firstName}</span>
      </button>

      <div className="invisible absolute right-0 top-full z-50 w-56 rounded-xl border border-border bg-white opacity-0 shadow-lg transition-[visibility,opacity] delay-300 duration-150 group-hover:visible group-hover:opacity-100 group-hover:delay-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:delay-0">
        <div className="border-b border-border/80 px-4 py-3">
          <p className="truncate text-sm font-bold text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-muted">{user.email}</p>
        </div>
        <nav aria-label="Account" className="flex flex-col p-2">
          <Link
            href={`/${locale.code}/account`}
            className="rounded-md px-3 py-2 text-sm text-ink transition-colors hover:bg-accent-soft"
          >
            {dictionary?.myAccount ?? "Account Profile"}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-accent-soft"
          >
            {dictionary?.signOut ?? "Sign Out"}
          </button>
        </nav>
      </div>
    </div>
  );
}
