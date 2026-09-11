import { createAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Catch-all handler for every better-auth endpoint (sign-up, sign-in,
 * sign-out, session, forgot-password, reset-password, etc.) — better-auth
 * owns the routing beneath this path entirely, matching its own
 * documented Next.js integration.
 */
async function handle(request: Request) {
  const { env, cf } = await getCloudflareContext({ async: true });
  const baseURL = new URL(request.url).origin;
  const auth = createAuth(env, cf, baseURL);
  return auth.handler(request);
}

export const GET = handle;
export const POST = handle;
