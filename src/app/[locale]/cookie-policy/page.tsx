import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Cookie Policy",
    description: `How ${siteConfig.name} uses cookies.`,
    path: `/${locale}/cookie-policy`,
  });
}

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy">
      <p>
        {siteConfig.name} uses a small number of strictly necessary cookies to keep you signed in and remember your
        preferences (such as reading font size). We do not use third-party advertising or tracking cookies at this
        time.
      </p>
      <p>
        Most browsers let you block or delete cookies through their settings. Doing so may prevent you from staying
        signed in.
      </p>
    </LegalPageLayout>
  );
}
