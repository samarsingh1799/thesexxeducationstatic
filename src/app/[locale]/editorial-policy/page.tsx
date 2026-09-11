import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Editorial Policy",
    description: `How ${siteConfig.name} researches, writes, and reviews its articles.`,
    path: `/${locale}/editorial-policy`,
  });
}

export default function EditorialPolicyPage() {
  return (
    <LegalPageLayout title="Editorial Policy">
      <p>
        Every article published on {siteConfig.name} is written to be accurate, balanced, and useful. We draw on
        credible, publicly available health and research sources, and we favor clear explanations over sensational
        claims.
      </p>
      <h2>Accuracy</h2>
      <p>
        We aim to keep articles up to date and will correct factual errors as soon as we become aware of them — see
        our Corrections Policy for how to report one.
      </p>
      <h2>Independence</h2>
      <p>
        Editorial content is never influenced by advertisers. Any sponsored or promotional content is clearly
        labeled as such (see our Advertising Disclosure).
      </p>
    </LegalPageLayout>
  );
}
