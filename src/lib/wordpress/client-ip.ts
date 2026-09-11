import "server-only";
import type { NextRequest } from "next/server";

/**
 * Best-effort real client IP extraction for forwarding to WordPress's
 * rate limiter (see feedback.ts's `clientIp` param). Without this,
 * WordPress sees every submission as coming from this Next.js server
 * itself (a server-to-server call), collapsing every real visitor's rate
 * limit into one shared global bucket.
 *
 * `x-forwarded-for`'s first entry is only reliably the true client when
 * the deployment's own edge overwrites (rather than appends to) that
 * header before it reaches this code. Defense-in-depth either way:
 * WordPress only trusts the forwarded value when the same request also
 * carries the internal secret — a value from here that's wrong or
 * spoofed at most degrades back to the shared-bucket behavior, never
 * grants any access.
 */
export function getClientIp(request: NextRequest): string | null {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return null;
}
