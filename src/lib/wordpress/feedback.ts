import "server-only";

/**
 * Forwards a "rate your experience" submission to the same sexxedu/v1
 * WordPress plugin (POST /wp-json/sexxedu/v1/feedback) the main
 * thesexxeducation.com frontend uses — feedback from every frontend
 * lands in one place. Deliberately separate from lib/wordpress/client.ts:
 * that file talks to the public, unauthenticated wp/v2 namespace; this
 * one namespace requires a shared secret to forward the real visitor IP.
 */

export class FeedbackApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type SubmitFeedbackInput = {
  rating: number;
  name: string;
  email: string;
  message: string;
  pageUrl?: string;
  contactable: boolean;
};

type ApiResult<T> = { success: true; data: T } | { success: false; error?: { code: string; message: string } };

function getWordPressUrl(): string {
  const url = process.env.WORDPRESS_URL;
  if (!url) throw new Error("WORDPRESS_URL is not set.");
  return url.replace(/\/+$/, "");
}

/**
 * The endpoint itself is public (no account required) — the shared
 * secret is only used, when configured, to let WordPress trust the
 * forwarded `clientIp` for its rate limiter. Omitting
 * SEXXEDU_INTERNAL_SECRET degrades to WordPress rate-limiting by this
 * server's own IP rather than blocking submissions outright.
 */
export async function submitFeedback(input: SubmitFeedbackInput, clientIp: string | null): Promise<{ id: number }> {
  const secret = process.env.SEXXEDU_INTERNAL_SECRET;

  const res = await fetch(`${getWordPressUrl()}/wp-json/sexxedu/v1/feedback`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(secret && clientIp ? { Authorization: `Bearer ${secret}`, "X-SexxEdu-Client-IP": clientIp } : {}),
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  let json: ApiResult<{ id: number }>;
  try {
    json = await res.json();
  } catch {
    throw new FeedbackApiError(`Non-JSON response from WordPress (HTTP ${res.status})`, res.status);
  }

  if (!json.success) {
    throw new FeedbackApiError(json.error?.message ?? `Request failed (HTTP ${res.status})`, res.status || 502);
  }
  return json.data;
}
