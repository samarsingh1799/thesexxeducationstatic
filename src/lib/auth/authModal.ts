/**
 * Opens the sign-in modal in place (see components/auth/AuthModal.tsx,
 * mounted globally in app/[locale]/layout.tsx) instead of navigating away
 * to the full /login page — used by every authentication-required action
 * on an otherwise fully public article page: Like, Save, Comment.
 *
 * `redirect` is baked in as `?authModal=signin&redirect=<articlePath>` —
 * SignInForm/SignUpForm read that `redirect` value verbatim as the URL to
 * navigate to once signed in, so `action` (when present) must be encoded
 * *inside* that redirect target's own query string, not as a sibling
 * param here, or it would be discarded the moment sign-in replaces the
 * URL with the redirect target.
 */
export type AuthAction = "like" | "save" | "comment";

export function buildAuthModalUrl(articlePath: string, action?: AuthAction): string {
  const redirectTarget = action ? `${articlePath}?action=${encodeURIComponent(action)}` : articlePath;
  const params = new URLSearchParams({ authModal: "signin", redirect: redirectTarget });
  return `${articlePath}?${params.toString()}`;
}
