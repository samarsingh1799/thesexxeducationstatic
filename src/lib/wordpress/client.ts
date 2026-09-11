/**
 * Low-level WordPress REST API client. Every WordPress request in the app
 * goes through here so caching, tagging, retries, and error handling stay
 * consistent — nothing else in the codebase should call `fetch()` against
 * the WordPress origin directly. Never imported by client-side code.
 */

function getWordPressUrl(): string {
  const url = process.env.WORDPRESS_URL;
  if (!url) {
    throw new Error("WORDPRESS_URL is not set. Configure it in .dev.vars (local) or as a Worker secret (production).");
  }
  return url.replace(/\/+$/, "");
}

function buildWordPressUrl(path: string): URL {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${getWordPressUrl()}${normalizedPath}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 300;

function retryDelayMs(attempt: number): number {
  return RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * RETRY_BASE_DELAY_MS;
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429 || status === 403;
}

/**
 * Retries only idempotent GET requests, and only on a 5xx, a 429, a 403 (rate limiting),
 * or a network-level failure — this project's shared WordPress hosting returns both
 * transient 500s under load and 429s/403s when a burst of requests (e.g. static generation)
 * lands in a short window.
 */
async function fetchWithRetry(url: string, init: RequestInit, retryable: boolean): Promise<Response> {
  const maxAttempts = retryable ? RETRYABLE_MAX_ATTEMPTS : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (retryable && isRetryableStatus(res.status) && attempt < maxAttempts) {
        const retryAfterHeader = Number(res.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader * 1000 : retryDelayMs(attempt);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (error) {
      if (!retryable || attempt === maxAttempts) throw error;
      await sleep(retryDelayMs(attempt));
    }
  }

  throw new Error("unreachable");
}

export type WPFetchOptions = {
  searchParams?: Record<string, string | number | boolean | undefined>;
  /** Cache lifetime in seconds. `false` caches indefinitely until tag-revalidated via revalidateTag(). */
  revalidate?: number | false;
  tags?: string[];
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
};

export type WPListResult<T> = {
  data: T;
  totalPages: number;
  totalItems: number;
};

/**
 * Fetches a path relative to the WordPress site root (e.g.
 * "/wp-json/wp/v2/posts" or "/wp-json/sexxedu/v1/translations/1/es").
 * Returns null on 404 so callers can treat "not found" as data, not an
 * error. `totalPages`/`totalItems` come from WordPress's pagination
 * headers when present (list endpoints), defaulting to 1/0 otherwise.
 */
export async function wpFetch<T>(
  path: string,
  { searchParams, revalidate = false, tags, method = "GET", body, headers }: WPFetchOptions = {}
): Promise<WPListResult<T> | null> {
  const url = buildWordPressUrl(path);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetchWithRetry(
    url.toString(),
    {
      method,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Thesexxeducation/1.0)",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...(method === "GET" ? { next: { revalidate, tags } } : { cache: "no-store" as const }),
    },
    method === "GET"
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(`WordPress request failed (${res.status}): ${url.pathname}${url.search}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`WordPress returned a non-JSON response (${res.status}) for ${url.pathname}. Preview: ${text.slice(0, 150)}`);
  }

  const data = (await res.json()) as T;
  const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");
  const totalItems = Number(res.headers.get("X-WP-Total") ?? "0");

  return { data, totalPages, totalItems };
}
