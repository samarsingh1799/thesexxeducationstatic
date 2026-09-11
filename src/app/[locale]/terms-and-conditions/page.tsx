import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Terms & Conditions",
    description: `The terms that govern your use of ${siteConfig.name}.`,
    path: `/${locale}/terms-and-conditions`,
  });
}

export default function TermsAndConditionsPage() {
  return (
    <LegalPageLayout title="Terms & Conditions">
      <p>
        By using {siteConfig.name}, you agree to these terms. If you do not agree, please do not use this site.
      </p>
      <h2>Content</h2>
      <p>
        All articles, images, and other content on this site are provided for general educational purposes only,
        as described in our <a href="../health-disclaimer">Health Disclaimer</a>. Content may not be copied or
        republished without permission — see our <a href="../copyright">Copyright</a> page.
      </p>
      <h2>Accounts</h2>
      <p>
        You are responsible for keeping your account credentials secure and for all activity under your account.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time; continued use of the site constitutes acceptance of changes.</p>
    </LegalPageLayout>
  );
}
