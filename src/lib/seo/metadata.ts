import type { Metadata } from "next";
import { siteConfig } from "./site-config";
import { getCanonicalUrl } from "./canonical";
import type { Post } from "@/types/content";

type BasePageMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** hreflang map, e.g. from getArticleTranslationUrls/getTranslationUrls — omit for pages that don't vary by locale (account, search). */
  translations?: Record<string, string>;
};

export function buildPageMetadata({ title, description, path, translations }: BasePageMetadataInput): Metadata {
  const canonical = getCanonicalUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical,
      ...(translations ? { languages: translations } : {}),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function buildArticleMetadata(post: Post, path: string, translations: Record<string, string>): Metadata {
  const title = post.seo.title || post.title;
  const description = post.seo.description || post.excerpt;
  const canonical = getCanonicalUrl(path);

  return {
    title,
    description,
    alternates: { canonical, languages: translations },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [post.author.name],
      ...(post.featuredImage
        ? { images: [{ url: post.featuredImage.url, width: post.featuredImage.width, height: post.featuredImage.height, alt: post.featuredImage.alt }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(post.featuredImage ? { images: [post.featuredImage.url] } : {}),
    },
  };
}

export function notFoundMetadata(): Metadata {
  return { title: "Not found", robots: { index: false, follow: true } };
}
