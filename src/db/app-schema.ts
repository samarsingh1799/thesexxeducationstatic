import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Application tables — separate from better-auth's own generated tables
 * (src/db/auth-schema.ts, produced by `npm run auth:schema`) so a re-run
 * of that generator never touches app data. Both live in the same D1
 * database (see wrangler.jsonc's single `DATABASE` binding); combined in
 * src/db/schema.ts.
 *
 * WordPress post/category/author ids are stored as plain integers (the
 * numeric WP REST API id) — this app never mirrors WordPress content
 * itself into D1, only references to it, so there's no sync/staleness
 * problem to manage.
 */

export const savedArticles = sqliteTable(
  "saved_articles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    postId: integer("post_id").notNull(),
    /** Denormalized at save time purely so "My Saved Articles" can render without an extra WordPress round-trip per row; the canonical source of truth is always WordPress. */
    slug: text("slug").notNull(),
    categorySlug: text("category_slug"),
    locale: text("locale").notNull().default("en"),
    title: text("title").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("saved_articles_user_id_idx").on(table.userId),
    uniqueIndex("saved_articles_user_post_locale_idx").on(table.userId, table.postId, table.locale),
  ]
);

export const readingHistory = sqliteTable(
  "reading_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    postId: integer("post_id").notNull(),
    slug: text("slug").notNull(),
    locale: text("locale").notNull().default("en"),
    viewedAt: integer("viewed_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("reading_history_user_id_idx").on(table.userId),
    index("reading_history_user_viewed_at_idx").on(table.userId, table.viewedAt),
  ]
);

export const followedCategories = sqliteTable(
  "followed_categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    categorySlug: text("category_slug").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("followed_categories_user_category_idx").on(table.userId, table.categorySlug)]
);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  preferredLocale: text("preferred_locale"),
  newsletterOptIn: integer("newsletter_opt_in", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const likedArticles = sqliteTable(
  "liked_articles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    postId: integer("post_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("liked_articles_user_id_idx").on(table.userId),
    uniqueIndex("liked_articles_user_post_idx").on(table.userId, table.postId),
  ]
);

/**
 * One row per English post id, incremented on every real page view (see
 * ViewTracker.tsx + app/api/posts/[postId]/view/route.ts) — the only
 * source the homepage's "Trending" section and the article page's
 * sidebar draw from. Never fabricated: a post with no rows here just
 * doesn't show up as trending, rather than being assigned a fake count.
 */
export const postViews = sqliteTable("post_views", {
  postId: integer("post_id").primaryKey(),
  count: integer("count").notNull().default(0),
});

/**
 * Reader comments — app-owned (D1), never mirrored into WordPress, same
 * pattern as savedArticles/likedArticles. Keyed only by `postId`, not by
 * locale: comments are one shared discussion thread per underlying
 * WordPress post regardless of which translation a reader is viewing it
 * in — locale-siloing the thread would leave most non-English locales
 * permanently empty. Sign-in is required to post (enforced in
 * api/comments/[postId]/route.ts, never client-side only); reading the
 * list requires no auth. `authorName` is denormalized at write time from
 * the session (same convention as savedArticles.title) so the list
 * renders without joining the auth `users` table.
 */
export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    postId: integer("post_id").notNull(),
    authorName: text("author_name").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("comments_post_id_idx").on(table.postId), index("comments_user_id_idx").on(table.userId)]
);

export const appSchema = {
  savedArticles,
  readingHistory,
  followedCategories,
  userPreferences,
  likedArticles,
  postViews,
  comments,
};
