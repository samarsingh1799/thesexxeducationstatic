import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: true } };

export default async function ResetPasswordPage() {
  const dictionary = await getDictionary();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-ink">{dictionary.resetPassword}</h1>
      <div className="mt-8">
        <Suspense fallback={null}>
          <ResetPasswordForm dictionary={dictionary} />
        </Suspense>
      </div>
    </div>
  );
}
