/**
 * The one place the production domain is decided. Unlike Vercel, Cloudflare
 * Workers has no auto-injected "this deployment's URL" environment
 * variable — a custom domain is attached to the Worker after deploy, so
 * the real domain must be set explicitly via NEXT_PUBLIC_SITE_URL once
 * you have one (Cloudflare dashboard → Workers → your worker → Settings →
 * Variables, or `wrangler.jsonc`'s `vars`). Never falls back to
 * request-derived host/protocol headers for canonical/metadata URLs —
 * that would make the same page emit a different canonical depending on
 * how it was requested (workers.dev preview URL vs. the real domain),
 * which is exactly the kind of inconsistency that confuses crawlers.
 */
function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "The SexxEducation",
  description: "Evidence-based sexual health education, relationships, and wellness guidance.",
  get url() {
    return getSiteUrl();
  },
};
