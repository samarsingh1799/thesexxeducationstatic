import { getCanonicalUrl } from "./canonical";

export type SitemapUrlEntry = {
  loc: string;
  lastModified?: string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderUrlSet(entries: SitemapUrlEntry[]): string {
  const urls = entries
    .map(
      (entry) => `<url>
<loc>${escapeXml(entry.loc)}</loc>${entry.lastModified ? `\n<lastmod>${entry.lastModified}</lastmod>` : ""}${entry.changeFrequency ? `\n<changefreq>${entry.changeFrequency}</changefreq>` : ""}${entry.priority !== undefined ? `\n<priority>${entry.priority}</priority>` : ""}
</url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export function renderSitemapIndex(sitemapPaths: string[]): string {
  const entries = sitemapPaths.map((path) => `<sitemap>\n<loc>${escapeXml(getCanonicalUrl(path))}</loc>\n</sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
}

export const XML_HEADERS = { "Content-Type": "application/xml" };
