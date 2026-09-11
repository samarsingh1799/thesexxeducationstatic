import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Advertising Disclosure",
    description: `How advertising works on ${siteConfig.name}.`,
    path: `/${locale}/advertising-disclosure`,
  });
}

export default function AdvertisingDisclosurePage() {
  return (
    <LegalPageLayout title="Advertising Disclosure">
      <p>
        {siteConfig.name} may display advertising to help support the cost of producing and hosting free
        educational content. Reserved ad placements are clearly marked &ldquo;Advertisement&rdquo; wherever they
        appear.
      </p>
      <p>
        Advertising never influences our editorial content or recommendations — see our{" "}
        <a href="../editorial-policy">Editorial Policy</a>.
      </p>
    </LegalPageLayout>
  );
}
