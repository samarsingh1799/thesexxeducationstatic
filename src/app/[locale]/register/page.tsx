import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: true } };

export default async function RegisterPage() {
  const dictionary = await getDictionary();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-ink">{dictionary.createAccount}</h1>
      <div className="mt-8">
        <Suspense fallback={null}>
          <SignUpForm dictionary={dictionary} />
        </Suspense>
      </div>
    </div>
  );
}
