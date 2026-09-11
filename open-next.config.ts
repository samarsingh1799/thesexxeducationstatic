import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

/**
 * Without an incremental cache override, ISR falls back to full SSR on
 * every request — this KV-backed cache (with a short-lived regional
 * in-memory layer in front of it) is what makes a statically generated
 * article page actually stay cached at the edge instead of re-rendering
 * per request, the direct equivalent of the previous deployment's
 * Vercel-managed ISR cache.
 *
 * KV, not R2: R2 requires a card on file to enable even within its free
 * tier (Cloudflare account-verification gate), which this project
 * deliberately avoids. Trade-off, straight from OpenNext's own docs: KV is
 * eventually consistent, so a page invalidated via revalidateTag/Path can
 * take a short while (observed: seconds, Cloudflare doesn't guarantee a
 * bound) to be reflected globally, unlike R2's strong consistency. Revisit
 * if that lag ever becomes noticeable in practice — switching back is a
 * one-file change plus creating an R2 bucket.
 *
 * d1NextTagCache backs revalidateTag()/revalidatePath() (used by
 * app/api/revalidate — the WordPress publish webhook) with the same D1
 * database used for app data; "long-lived" regional caching is safe here
 * because every invalidation goes through that explicit tag-based path,
 * never a bare time-based expiry silently going stale.
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(kvIncrementalCache, { mode: "long-lived" }),
  tagCache: d1NextTagCache,
});
