import type { NextConfig } from "next";

const wordpressUrl = new URL(process.env.WORDPRESS_URL || "http://localhost");

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;

// Lets `next dev` read the same D1/R2/KV bindings Wrangler provides in
// production/preview, instead of throwing when route code calls
// getCloudflareContext() during ordinary local development.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
