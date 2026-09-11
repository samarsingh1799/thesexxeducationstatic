import { getPostsSitemapEntries } from "@/lib/seo/sitemap-entries";
import { renderUrlSet, XML_HEADERS } from "@/lib/seo/sitemap-xml";

export const revalidate = false;

export async function GET() {
  return new Response(renderUrlSet(await getPostsSitemapEntries("pt")), { headers: XML_HEADERS });
}
