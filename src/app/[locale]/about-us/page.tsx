import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "About Us",
    description: `Learn about ${siteConfig.name}'s mission to provide clear, evidence-based sexual health education.`,
    path: `/${locale}/about-us`,
  });
}

export default function AboutUsPage() {
  return (
    <LegalPageLayout title="About Us">
      <p>
        {siteConfig.name} is an independent publication dedicated to sexual health, relationships, and wellbeing
        education. Our goal is to make accurate, judgment-free information accessible to everyone, regardless of
        background or experience level.
      </p>
      <p>
        We cover topics ranging from reproductive health and consent to relationships and emotional wellbeing,
        always aiming for clarity over sensationalism. Our articles are written to inform, not to diagnose or
        replace professional medical advice.
      </p>
      <p>
        We believe good sexual health education reduces stigma and helps people make informed decisions about
        their own bodies and relationships.
      </p>
    </LegalPageLayout>
  );
}
