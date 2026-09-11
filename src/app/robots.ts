import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/*/login", "/*/register", "/*/forgot-password", "/*/reset-password", "/*/account"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
