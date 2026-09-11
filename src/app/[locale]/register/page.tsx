import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionary";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: true } };

export default async function RegisterPage() {
  const dictionary = await getDictionary();
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-ink">{dictionary.createAccount}</h1>
      <div className="mt-6">
        <SignUpForm dictionary={dictionary} />
      </div>
    </div>
  );
}
