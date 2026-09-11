import { siteConfig } from "./site-config";
import { getCanonicalUrl } from "./canonical";
import type { Post } from "@/types/content";

/**
 * Every JSON-LD block this app emits, generated only from real article
 * data — never fabricated fields, never schema that doesn't match what's
 * actually visible on the page.
 */

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export function getBreadcrumbSchema(items: Array<{ name: string; href: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.href),
    })),
  };
}

export function getArticleSchema(post: Post, path: string, bcp47: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seo.description || post.excerpt,
    inLanguage: bcp47,
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt,
    image: post.featuredImage ? [post.featuredImage.url] : undefined,
    author: { "@type": "Person", name: post.author.name },
    publisher: getOrganizationSchema(),
    mainEntityOfPage: { "@type": "WebPage", "@id": getCanonicalUrl(path) },
    articleSection: post.category?.name,
    keywords: post.tags.length > 0 ? post.tags.map((tag) => tag.name).join(", ") : undefined,
  };
}
