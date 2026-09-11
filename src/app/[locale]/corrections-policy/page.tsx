import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Corrections Policy",
    description: `How ${siteConfig.name} handles factual corrections.`,
    path: `/${locale}/corrections-policy`,
  });
}

export default function CorrectionsPolicyPage() {
  return (
    <LegalPageLayout title="Corrections Policy">
      <p>
        We take accuracy seriously. If you believe an article contains a factual error, please let us know via our{" "}
        <a href="../contact">Contact page</a> with a link to the article and a description of the issue.
      </p>
      <p>
        Once verified, corrections are made directly to the article. Substantive corrections that materially change
        an article&apos;s meaning are noted at the bottom of the piece along with the date of the update.
      </p>
    </LegalPageLayout>
  );
}
