import { renderSitemapIndex, XML_HEADERS } from "@/lib/seo/sitemap-xml";
import { locales } from "@/lib/i18n/locales";

export const revalidate = false;

export async function GET() {
  const paths = ["/sitemap-pages.xml", ...locales.map((locale) => `/sitemap-posts-${locale.code}.xml`)];
  return new Response(renderSitemapIndex(paths), { headers: XML_HEADERS });
}
