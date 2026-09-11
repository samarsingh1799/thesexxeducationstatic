/** Raw shapes as WordPress's REST API actually returns them — never used outside this lib/wordpress/ layer; every consumer gets the normalized types in src/types/content.ts instead. */

export type WPRendered = { rendered: string; protected?: boolean };

export type WPTerm = {
  id: number;
  name: string;
  slug: string;
  taxonomy: "category" | "post_tag";
  count: number;
  parent?: number;
};

export type WPMedia = {
  id: number;
  source_url: string;
  alt_text: string;
  media_details?: { width?: number; height?: number };
};

export type WPUser = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatar_urls?: Record<string, string>;
};

export type WPPost = {
  id: number;
  slug: string;
  status: string;
  date_gmt: string;
  modified_gmt: string;
  title: WPRendered;
  excerpt: WPRendered;
  content: WPRendered;
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  meta?: {
    rank_math_title?: string;
    rank_math_description?: string;
  };
  _embedded?: {
    author?: WPUser[];
    "wp:featuredmedia"?: WPMedia[];
    "wp:term"?: WPTerm[][];
  };
};

export type WPCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  parent: number;
};

export type WPTag = {
  id: number;
  name: string;
  slug: string;
  count: number;
};
