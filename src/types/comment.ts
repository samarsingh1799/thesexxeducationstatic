/** App-owned (D1) reader comment — see src/db/app-schema.ts's `comments` table and api/comments/[postId]/route.ts. Never a WordPress entity. */
export type Comment = {
  id: string;
  authorName: string;
  content: string;
  /** ISO string, as returned by the API — the DB layer's Date is serialized to JSON before this type is ever used client-side. */
  createdAt: string;
};
