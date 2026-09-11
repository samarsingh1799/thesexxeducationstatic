import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/dictionary";
import { SavedArticlesList } from "@/components/account/SavedArticlesList";

// Never statically generated/ISR-cached: this page's content is entirely
// per-user (name, email, saved articles) — see spec section 14/16. The
// public article pages this account links to remain fully cacheable;
// only this page, and the /api/* routes it calls, are dynamic.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [session, dictionary] = await Promise.all([getCurrentSession(), getDictionary()]);

  if (!session) redirect(`/${locale}/login`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold text-ink">{dictionary.myAccount}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {session.user.name} &middot; {session.user.email}
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">{dictionary.savedArticles}</h2>
        <SavedArticlesList emptyLabel={dictionary.noArticles} />
      </section>
    </div>
  );
}
