import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site-config";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Copyright",
    description: `Copyright information for ${siteConfig.name}.`,
    path: `/${locale}/copyright`,
  });
}

export default function CopyrightPage() {
  return (
    <LegalPageLayout title="Copyright">
      <p>
        &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved. All articles, images, and other
        original content published on this site are the property of {siteConfig.name} or its licensors, unless
        otherwise noted.
      </p>
      <p>
        No part of this site may be reproduced or republished without prior written permission, except for brief
        quotations used for commentary or review, with proper attribution and a link back to the original article.
      </p>
    </LegalPageLayout>
  );
}
