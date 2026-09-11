import "server-only";
import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { schema } from "@/db/schema";

/** Per-request Drizzle instance bound to this request's real D1 database — same reasoning as lib/auth/index.ts: no module-level singleton on Workers. */
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DATABASE, { schema });
}
