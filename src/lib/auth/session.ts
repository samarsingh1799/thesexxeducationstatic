import "server-only";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";

/**
 * Server Component / route-handler session lookup — rebuilds the auth
 * instance with this request's real D1/cf bindings (see lib/auth/index.ts
 * for why this can't be a module-level singleton on Workers) and asks
 * better-auth to validate the session cookie. Returns null for a
 * signed-out visitor; never throws for that case, so callers can use it
 * directly in page bodies without a try/catch.
 */
export async function getCurrentSession() {
  const { env, cf } = await getCloudflareContext({ async: true });
  const auth = createAuth(env, cf);
  const requestHeaders = await headers();
  return auth.api.getSession({ headers: requestHeaders });
}
