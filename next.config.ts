import type { NextConfig } from "next";

const wordpressUrl = new URL(process.env.WORDPRESS_URL || "http://localhost");

const nextConfig: NextConfig = {
  experimental: {
    // The home page is concretely prerendered per locale at build time
    // (the [locale] layout's generateStaticParams enumerates every
    // locale), and each one fires ~10 WordPress requests (posts,
    // categories, authors, trending). Left at Next's default, `next build`
    // fires enough of these concurrently across workers to trip this
    // project's shared WordPress host's rate limiting (403s — see
    // lib/wordpress/client.ts's own comment anticipating exactly this).
    // Those failures are already caught and logged, never fatal to the
    // build (getPosts/getPostById degrade to an empty result), but a
    // gentler build-time request rate means fewer pages silently render
    // with an empty "Trending"/related-posts section. Runtime traffic
    // after deploy is unaffected — this only throttles `next build` itself.
    staticGenerationMaxConcurrency: 1,
  },
  images: {
    // No custom loader needed: the OpenNext Cloudflare adapter proxies
    // next/image's default optimization route through the `IMAGES`
    // binding declared in wrangler.jsonc (Cloudflare's own image
    // resizer), the direct equivalent of Vercel's built-in Image
    // Optimization on the previous deployment target.
    remotePatterns: [
      {
        protocol: wordpressUrl.protocol.replace(":", "") as "http" | "https",
        hostname: wordpressUrl.hostname,
        pathname: "/**",
      },
      // WordPress's REST API (`avatar_urls`) falls back to Gravatar for any
      // author with no locally uploaded avatar — this is core WordPress
      // behavior (get_avatar_url()), not something specific to this site's
      // config, so it's allowlisted unconditionally alongside the WordPress
      // origin itself. Without this, any author page/bio/spotlight that
      // renders that fallback avatar through next/image 500s outright
      // ("Invalid src prop ... hostname not configured").
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        pathname: "/avatar/**",
      },
    ],
  },
};

export default nextConfig;

// Lets `next dev` read the same D1/R2/KV bindings Wrangler provides in
// production/preview, instead of throwing when route code calls
// getCloudflareContext() during ordinary local development.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
