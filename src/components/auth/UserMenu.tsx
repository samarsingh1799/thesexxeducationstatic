"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { useCurrentLocale } from "@/lib/i18n/useCurrentLocale";

export function UserMenu({ dictionary }: { dictionary: { signIn: string; signUp: string; signOut: string; myAccount: string } }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const locale = useCurrentLocale();

  if (isPending) return <div className="h-5 w-20 animate-pulse rounded bg-gray-100" aria-hidden="true" />;

  if (!session) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href={`/${locale.code}/login`} className="text-ink hover:text-accent">
          {dictionary.signIn}
        </Link>
        <Link href={`/${locale.code}/register`} className="rounded-md bg-ink px-3 py-1.5 font-medium text-white hover:bg-black">
          {dictionary.signUp}
        </Link>
      </div>
    );
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push(`/${locale.code}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href={`/${locale.code}/account`} className="text-ink hover:text-accent">
        {dictionary.myAccount}
      </Link>
      <button type="button" onClick={handleSignOut} className="text-ink-muted hover:text-accent">
        {dictionary.signOut}
      </button>
    </div>
  );
}
