import { wpFetch } from "./client";
import { decodeEntities } from "@/lib/content/html";
import type { FeaturedImage } from "@/types/content";
import type { WPMedia } from "./wp-types";

/** Standalone media lookup by id — posts.ts already normalizes a post's own featured image via `_embed`; this is for the rarer case of only having a media id (e.g. from a webhook payload). */
export async function getMediaById(id: number): Promise<FeaturedImage | null> {
  const result = await wpFetch<WPMedia>(`/wp-json/wp/v2/media/${id}`, { revalidate: false });
  if (!result?.data) return null;

  return {
    url: result.data.source_url,
    alt: result.data.alt_text ? decodeEntities(result.data.alt_text) : "",
    width: result.data.media_details?.width,
    height: result.data.media_details?.height,
  };
}
