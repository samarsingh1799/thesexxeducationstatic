import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Privacy Policy",
    description: `How ${siteConfig.name} collects and uses information.`,
    path: `/${locale}/privacy-policy`,
  });
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p>
        This policy explains what information {siteConfig.name} collects when you use this site, and how it is
        used.
      </p>
      <h2>Account information</h2>
      <p>
        If you create an account, we store your name and email address to let you sign in, save articles, and like
        articles. We never sell this information to third parties.
      </p>
      <h2>Usage data</h2>
      <p>
        We record aggregate, non-identifying article view counts to power features like our Trending section. This
        data is not tied to your identity.
      </p>
      <h2>Cookies</h2>
      <p>
        We use essential cookies to keep you signed in. See our <a href="../cookie-policy">Cookie Policy</a> for
        details.
      </p>
      <h2>Your choices</h2>
      <p>
        You can delete your account and associated saved/liked articles at any time from your account settings.
      </p>
    </LegalPageLayout>
  );
}
