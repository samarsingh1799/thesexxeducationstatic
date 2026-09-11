import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Accessibility",
    description: `${siteConfig.name}'s commitment to a site that's usable by everyone.`,
    path: `/${locale}/accessibility`,
  });
}

export default function AccessibilityPage() {
  return (
    <LegalPageLayout title="Accessibility Statement">
      <p>
        {siteConfig.name} is committed to making our content accessible to as many people as possible, including
        people who use assistive technology such as screen readers or keyboard-only navigation.
      </p>
      <p>
        We aim to follow established web accessibility guidelines in the design and structure of our pages. If you
        encounter a barrier while using this site, please tell us via our <a href="../contact">Contact page</a> so
        we can address it.
      </p>
    </LegalPageLayout>
  );
}
