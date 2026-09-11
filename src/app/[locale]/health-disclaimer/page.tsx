import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Health Disclaimer",
    description: `Important information about the educational nature of ${siteConfig.name}'s content.`,
    path: `/${locale}/health-disclaimer`,
  });
}

export default function HealthDisclaimerPage() {
  return (
    <LegalPageLayout title="Health Disclaimer">
      <p>
        The content on {siteConfig.name} is provided for general educational and informational purposes only. It is
        not intended to be, and should not be taken as, medical advice, diagnosis, or treatment.
      </p>
      <p>
        Always seek the advice of a qualified physician or other health provider with any questions you may have
        regarding a medical condition. Never disregard professional medical advice or delay seeking it because of
        something you have read on this site.
      </p>
    </LegalPageLayout>
  );
}
