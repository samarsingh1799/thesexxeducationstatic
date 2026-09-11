import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "@/db/schema";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/auth/email";

/**
 * Auth backend: email/password + session management, backed by D1 via
 * Drizzle. Built as a factory (not a module-level singleton) because the
 * D1 binding is only available per-request on Cloudflare Workers (there's
 * no long-lived process to hold a module-level connection the way a
 * traditional Node server would) — every route handler calls
 * getCloudflareContext() itself and passes the bindings in.
 *
 * `env` is undefined during `next build`'s static analysis pass (metadata
 * generation etc. import this module without ever calling the handler);
 * the `database` fallback below only exists so that import doesn't throw
 * — it's never actually queried outside a real request.
 */
export function createAuth(env?: CloudflareEnv, cf?: IncomingRequestCfProperties, baseURL?: string) {
  const db = env ? drizzle(env.DATABASE, { schema, logger: false }) : undefined;

  return betterAuth({
    baseURL: baseURL ?? env?.BETTER_AUTH_URL,
    secret: env?.BETTER_AUTH_SECRET,
    ...withCloudflare(
      {
        autoDetectIpAddress: true,
        geolocationTracking: false,
        cf: cf ?? {},
        d1: db ? { db, options: { usePlural: true } } : undefined,
      },
      {
        emailAndPassword: {
          enabled: true,
          requireEmailVerification: false,
          sendResetPassword: async ({ user, url }) => {
            await sendPasswordResetEmail(user.email, url);
          },
        },
        emailVerification: {
          sendVerificationEmail: async ({ user, url }) => {
            await sendVerificationEmail(user.email, url);
          },
        },
        // "Continue with Google" — better-auth's own callback convention,
        // {BETTER_AUTH_URL}/api/auth/callback/google, is what must be
        // registered as the Authorized redirect URI in Google Cloud
        // Console (Credentials → the OAuth client). Leaving the env vars
        // unset doesn't crash anything — better-auth just logs a
        // "missing clientId" warning and the button's flow fails at the
        // Google redirect step.
        socialProviders: {
          google: {
            clientId: env?.GOOGLE_CLIENT_ID ?? "",
            clientSecret: env?.GOOGLE_CLIENT_SECRET ?? "",
          },
        },
        session: {
          // 7-day session lifetime, refreshed on activity — long enough
          // a returning reader doesn't get logged out between visits,
          // short enough a stolen/forgotten session doesn't stay valid
          // indefinitely.
          expiresIn: 60 * 60 * 24 * 7,
          updateAge: 60 * 60 * 24,
        },
      }
    ),
    ...(db
      ? {}
      : {
          // Build-time-only stand-in — see the comment above.
          database: drizzleAdapter({} as D1Database, { provider: "sqlite", usePlural: true }),
        }),
  });
}

export type Auth = ReturnType<typeof createAuth>;
