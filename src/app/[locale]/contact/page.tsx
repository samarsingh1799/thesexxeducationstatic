import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Contact",
    description: `Get in touch with the ${siteConfig.name} team.`,
    path: `/${locale}/contact`,
  });
}

export default function ContactPage() {
  return (
    <LegalPageLayout title="Contact">
      <p>
        Have a question about an article, spotted something that needs a correction, or want to share feedback?
        We&apos;d like to hear from you.
      </p>
      <p>
        For editorial questions, corrections, or general inquiries, please reach out via email at{" "}
        <a href={`mailto:hello@${new URL(siteConfig.url).hostname.replace(/^www\./, "")}`}>
          hello@{new URL(siteConfig.url).hostname.replace(/^www\./, "")}
        </a>
        . We aim to respond within a few business days.
      </p>
    </LegalPageLayout>
  );
}
