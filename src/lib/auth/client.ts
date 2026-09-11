"use client";

import { createAuthClient } from "better-auth/react";
import { siteConfig } from "@/lib/seo/site-config";

/**
 * Browser-side auth client — talks to app/api/auth/[...all]/route.ts.
 * Used by sign-in/sign-up forms and the account menu; never used in
 * Server Components (use lib/auth/session.ts there instead).
 *
 * baseURL must be absolute, not "/api/auth" — this module is imported by
 * "use client" components, which Next.js still evaluates once server-side
 * during prerendering, and better-auth's client validates the URL
 * immediately at construction time (before any real request is made),
 * which throws on a relative string outside a browser.
 */
export const authClient = createAuthClient({
  baseURL: `${siteConfig.url}/api/auth`,
});
