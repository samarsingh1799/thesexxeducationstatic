import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";

export default async function LocaleNotFound() {
  const dictionary = await getDictionary();

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-ink">{dictionary.pageNotFoundTitle}</h1>
      <p className="mt-2 text-ink-muted">{dictionary.pageNotFoundBody}</p>
      <Link href="/" className="mt-6 inline-block text-accent hover:underline">
        {dictionary.backToHome}
      </Link>
    </div>
  );
}
