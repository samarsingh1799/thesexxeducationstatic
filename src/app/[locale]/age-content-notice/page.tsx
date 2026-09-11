import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Age & Content Notice",
    description: `Who ${siteConfig.name}'s content is intended for.`,
    path: `/${locale}/age-content-notice`,
  });
}

export default function AgeContentNoticePage() {
  return (
    <LegalPageLayout title="Age & Content Notice">
      <p>
        {siteConfig.name} publishes educational content about sexual health, relationships, and wellbeing intended
        for an adult audience. Some articles discuss sexual topics in a frank, educational manner.
      </p>
      <p>
        This site is not intended for minors. If you are under the age of majority in your jurisdiction, please
        browse this site with a parent or guardian, or exit now.
      </p>
    </LegalPageLayout>
  );
}
