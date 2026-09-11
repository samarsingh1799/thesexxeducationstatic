import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: true } };

export default async function ForgotPasswordPage() {
  const dictionary = await getDictionary();
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-ink">{dictionary.forgotPassword}</h1>
      <div className="mt-6">
        <ForgotPasswordForm dictionary={dictionary} />
      </div>
    </div>
  );
}
