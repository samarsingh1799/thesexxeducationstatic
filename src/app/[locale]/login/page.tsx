import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };

export default async function LoginPage() {
  const dictionary = await getDictionary();
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-ink">{dictionary.signIn}</h1>
      <div className="mt-6">
        {/* SignInForm reads ?redirect= via useSearchParams, which forces a Suspense boundary during static prerendering. */}
        <Suspense fallback={null}>
          <SignInForm dictionary={dictionary} />
        </Suspense>
      </div>
    </div>
  );
}
