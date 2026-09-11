export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count: number;
  parentId?: number;
};

export type CategoryWithChildren = Category & {
  children: Category[];
};

export type Tag = {
  id: number;
  name: string;
  slug: string;
  count: number;
};

export type Author = {
  id: number;
  name: string;
  slug: string;
  avatarUrl?: string;
  bio?: string;
};

export type FeaturedImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export type PostSummary = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  modifiedAt: string;
  category?: Category;
  author: Author;
  featuredImage?: FeaturedImage;
};

export type Post = PostSummary & {
  contentHtml: string;
  tags: Tag[];
  seo: {
    title?: string;
    description?: string;
  };
};

/** Which languages a specific post has a real, published translation in — never assume, always check (see lib/wordpress/languages.ts). */
export type TranslationAvailability = {
  postId: number;
  availableLocales: string[];
};
