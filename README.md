# Cloudflaretest

A production-grade, SEO-first, multilingual news/blog site: Next.js 16 (App Router) + headless WordPress, deployed on Cloudflare Workers.

## 1. Architecture overview

- **CMS**: WordPress (REST API only — editors publish exactly as they do today).
- **Frontend**: Next.js 16 App Router, Server Components by default, deployed to Cloudflare Workers via `@opennextjs/cloudflare` (runs the real `next build` output on Workers, not a reimplementation).
- **Routing**: every locale lives under `app/[locale]/...` (`/en`, `/hi`, `/es`, `/fr` — English included, uniformly prefixed), per Next.js's own documented i18n pattern.
- **Data**: WordPress content is fetched at request time and cached via Next's own cache (tags + ISR) — never mirrored into a database. App-owned data (accounts, sessions, saved articles) lives in Cloudflare D1.
- **Auth**: better-auth (email/password), sessions in D1, no third-party auth dependency.

## 2. Rendering strategy

| Route type | Mode | Why |
|---|---|---|
| `/[locale]`, `/[locale]/[category]/[slug]`, `/category/[slug]`, `/tag/[slug]`, `/author/[slug]` | Static + on-demand ISR (`revalidate = false`, `dynamicParams = true`, empty `generateStaticParams`) | Public content — cacheable at the edge, invalidated only by the WordPress webhook, never by a timer. `generateStaticParams` is exported (even returning `[]`) specifically because *its presence*, not what it returns, is what makes Next register the route as ISR-eligible instead of a plain per-request dynamic function. |
| `/[locale]/login`, `/register`, `/forgot-password`, `/reset-password` | Static | The form shell has no personalization; the actual auth calls go to `/api/auth/*`. |
| `/[locale]/account`, `/[locale]/search` | `force-dynamic` | Genuinely per-user or per-query; never cached. |
| `/api/*` | Always dynamic | Every mutation and every read of private data. |

Never let login existing make the *whole* site dynamic — article pages stay cacheable regardless of auth state; a signed-in reader's "Save" button is a Client Component island that calls `/api/bookmarks/*`, never something the article page's own server render depends on.

## 3. Authentication architecture

- **better-auth** (`src/lib/auth/index.ts`), Drizzle adapter, D1-backed. Built as a **factory** (`createAuth(env, cf, baseURL)`), not a module-level singleton — Cloudflare Workers has no long-lived process to hold a DB connection across requests, so every route handler rebuilds it from that request's real bindings via `getCloudflareContext()`.
- Passwords: hashed by better-auth itself (never rolled by hand).
- Sessions: HttpOnly, Secure (production), 7-day expiry with activity-based refresh.
- Server-side session check: `src/lib/auth/session.ts#getCurrentSession()` — used by `/account` to redirect signed-out visitors, and by every `/api/bookmarks/*` route to authorize the request.
- Email (verification, password reset): stubbed to console logging in `src/lib/auth/email.ts` — **no email provider is wired up yet**; plug in Resend/Postmark/SES there before shipping registration for real.

## 4. Multilingual routing architecture

- `src/lib/i18n/locales.ts` is the single source of truth for supported locales — nothing else hardcodes a language list.
- Every route lives under `app/[locale]/...`; `next/root-params`'s `locale()` getter reads the segment in Server Components/utilities without prop-drilling (a Next.js 16 API — Client Components still read it from the URL via `useCurrentLocale()`, since root-params don't work there).
- Article translations are read from this WordPress instance's `sexxedu/v1` plugin (`src/lib/wordpress/languages.ts`) — **this is the one file that's coupled to that specific plugin**; pointing this app at a different WordPress instance without it means rewriting only this file (e.g. for WPML/Polylang).
- Category/tag/author/home pages render in every locale unconditionally (never a 404); article listings are filtered to only the posts that actually have a published translation (`getTranslatedPostSummaries`) — showing an English title on `/hi` would be worse than showing fewer, but genuinely Hindi, articles.
- hreflang: every article's `alternates.languages` only ever includes locales with a *real* published translation, plus English and `x-default`. Never a link to a 404.

## 5. WordPress integration architecture

`src/lib/wordpress/` — `client.ts` (retrying fetch wrapper, tag-based caching), `posts.ts`, `categories.ts`, `tags.ts`, `authors.ts`, `media.ts`, `languages.ts`. Nothing outside this folder calls `fetch()` against WordPress directly.

Known WordPress REST API constraint hit and worked around: `?who=authors` on `/wp/v2/users` requires authentication (core WordPress behavior) — `getAllAuthors()` omits it deliberately, since the unauthenticated endpoint already only lists users with published posts.

## 6. Cache strategy

- Every WordPress fetch is tagged (`src/lib/cache/tags.ts`) and cached indefinitely (`revalidate: false`) — the *only* way a public page's data changes is an explicit tag invalidation.
- On Cloudflare, the actual cache storage is: **R2** for rendered page/data output (`open-next.config.ts`'s `r2IncrementalCache`, wrapped in a short-lived regional in-memory layer) and **D1** for the tag→path mapping (`d1NextTagCache`) that makes `revalidateTag`/`revalidatePath` actually work. Without these overrides, ISR silently falls back to full SSR on every request.
- Private data (sessions, saved articles) never touches this cache layer at all — `/api/*` routes are always dynamic.

## 7. Revalidation strategy

`POST /api/revalidate`, bearer-token-gated (`REVALIDATE_SECRET`). Point your WordPress webhook plugin at it with a payload like:

```json
{ "type": "post", "postId": 234, "slug": "pms-symptoms-causes-and-treatment", "categorySlug": "menstrual-health" }
```

`type` is one of `post` / `post.deleted` / `category` / `tag` / `author`. Always prefers `revalidateTag()` (targeted — one post's update never re-renders the whole site) with `revalidatePath()` for every locale's copy of the page as a belt-and-suspenders on top.

## 8. SEO strategy

- Every page uses the Metadata API (`src/lib/seo/metadata.ts`) — title/description/canonical/OG/Twitter, never hardcoded.
- JSON-LD (`src/lib/seo/schema.ts`): `Organization` + `WebSite` (root layout), `Article` + `BreadcrumbList` (article pages), `BreadcrumbList` (category/author) — generated only from real post data.
- Article content is sanitized (`src/lib/content/sanitize.ts`) before rendering — strips `<script>`/inline event handlers/`javascript:` URLs, allowlists YouTube/Vimeo embeds. Not a full DOM-based sanitizer (no DOM implementation exists in the Workers runtime); targeted at the actually-dangerous constructs.
- Tag pages are deliberately `noindex` (thin/overlapping with categories at this scale) but still fully crawlable and linked — a documented decision, not an oversight.

## 9. Sitemap strategy

`/sitemap.xml` (index) → `/sitemap-pages.xml` (home/category/author × every locale) + `/sitemap-posts-{en,hi,es,fr}.xml`. Each locale's posts sitemap only lists articles actually translated into it (same rule as hreflang). Regenerates automatically whenever `revalidateTag(cacheTags.sitemap())` fires from the webhook.

## 10. Cloudflare deployment strategy

- Adapter: `@opennextjs/cloudflare` (chosen over Cloudflare's newer `vinext` — see below).
- Bindings (`wrangler.jsonc`): `DATABASE` (D1, app data + auth), `NEXT_INC_CACHE_R2_BUCKET` (R2, ISR cache), `IMAGES` (Cloudflare's native image resizer — `next/image` needs no custom loader once this binding exists), `ASSETS` (static files), `WORKER_SELF_REFERENCE`.
- **Why not `vinext`**: Cloudflare's own new default, but it's a from-scratch reimplementation of the Next.js API surface on Vite (not running your actual `next build` output), only weeks old at time of writing, and Cloudflare's own docs note compatibility gaps in "newer App Router features" — exactly the surface (Metadata API, `generateStaticParams`, ISR) this project depends on for SEO. `@opennextjs/cloudflare` runs real Next.js semantics and has a real production track record; worth revisiting once vinext matures.
- Verified locally end-to-end without any live Cloudflare account: `npm run preview` builds the OpenNext bundle and runs it under Wrangler's local Workers runtime (Miniflare) — real D1 (SQLite-backed), real R2, real bindings, all emulated locally.

## 11. Security considerations

- Webhook (`/api/revalidate`) and any future admin endpoint: bearer-token-gated, never open.
- Secrets (`REVALIDATE_SECRET`, `BETTER_AUTH_SECRET`, `WORDPRESS_URL`) live in `.dev.vars`/`.env.local` locally (gitignored) and as Worker secrets (`wrangler secret put`) in production — never in client-side code, never in `wrangler.jsonc`'s committed `vars`.
- Article HTML is sanitized before render (see §8). Never `dangerouslySetInnerHTML` raw, unsanitized WordPress output.
- Private user data (session, saved articles, reading history) is fetched only through authenticated `/api/*` routes that check `getCurrentSession()` first — never folded into a page's own cacheable server render.
- Password reset always returns the same response whether or not the email exists (no account-enumeration leak).

## 12. Final folder structure

```
src/
  app/
    [locale]/
      page.tsx                    # home
      [category]/[slug]/page.tsx  # article (primary route)
      article/[slug]/page.tsx     # categoryless-post fallback, redirects
      category/[slug]/page.tsx
      tag/[slug]/page.tsx
      author/[slug]/page.tsx
      search/page.tsx
      login/ register/ forgot-password/ reset-password/ account/
      layout.tsx  not-found.tsx  error.tsx
    api/
      auth/[...all]/route.ts      # better-auth catch-all
      bookmarks/route.ts  bookmarks/[postId]/route.ts
      revalidate/route.ts         # WordPress webhook
    sitemap.xml/  sitemap-pages.xml/  sitemap-posts-{en,hi,es,fr}.xml/
    robots.ts
  components/
    article/  auth/  account/  layout/  seo/
  lib/
    wordpress/   # client, posts, categories, tags, authors, media, languages
    auth/        # index (factory), client, session, email
    i18n/        # locales, dictionary, useCurrentLocale, dictionaries/*.json
    seo/         # metadata, canonical, schema, sitemap-xml, sitemap-entries, site-config
    cache/       # tags
    content/     # html (entity decoding), sanitize
    db/          # per-request Drizzle instance
  db/
    schema.ts  app-schema.ts  auth-schema.ts (generated)
  types/content.ts
migrations/        # SQL, applied via `wrangler d1 migrations apply`
wrangler.jsonc  open-next.config.ts  drizzle.config.ts
```

## 13. Environment variables

See `.env.example`. Copy it to **both** `.env.local` (plain `next dev`/`next build`) and `.dev.vars` (Wrangler-based commands) for local development — each tool reads only its own file.

## 14. Installation instructions

```bash
nvm use            # Wrangler requires Node >=22; this repo pins 22.23.2 via .nvmrc
npm install
cp .env.example .env.local && cp .env.example .dev.vars
# fill in WORDPRESS_URL, REVALIDATE_SECRET, BETTER_AUTH_SECRET in both files

npm run db:generate           # SQL migration from src/db/schema.ts
npm run db:migrate:local      # applies it to a local D1 emulation (SQLite, no Cloudflare account needed)

npm run dev                   # plain Next.js dev server, http://localhost:3000
# — or —
npm run preview               # builds + runs the real OpenNext/Workers bundle locally via Wrangler
```

## 15. Deployment instructions

1. `wrangler login` (one-time).
2. `wrangler d1 create cloudflaretest-db` → paste the returned `database_id` into `wrangler.jsonc`.
3. `wrangler r2 bucket create cloudflaretest-isr-cache`.
4. `npm run db:migrate:remote` — applies migrations to the real D1 database.
5. Set production secrets: `wrangler secret put REVALIDATE_SECRET`, `wrangler secret put BETTER_AUTH_SECRET`, `wrangler secret put WORDPRESS_URL`.
6. Set `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` to your real domain (`wrangler.jsonc`'s `vars`, or as secrets if you'd rather not commit them).
7. `npm run deploy`.
8. Attach your custom domain in the Cloudflare dashboard (Workers → your worker → Settings → Domains & Routes).
9. Point your WordPress webhook plugin's endpoint at `https://your-domain/api/revalidate` with the `REVALIDATE_SECRET` you set.

## 16. Testing checklist

- [x] `npx tsc --noEmit` clean
- [x] `npx eslint .` clean
- [x] `npm run build` (plain Next.js) — all routes build, correct static/dynamic split
- [x] `npm run preview` (real OpenNext/Workers bundle via local Wrangler) — verified against real WordPress data:
  - [x] Home, article, category pages return real server-rendered content (view-source, not JS-rendered)
  - [x] JSON-LD present and matches visible content
  - [x] hreflang/canonical present and correct
  - [x] `/es` homepage correctly filtered to only translated articles
  - [x] Sign-up → real row in local D1 `users` table
  - [x] Sign-in → session cookie → save article → real row in `saved_articles`, scoped to that user
  - [x] `/api/revalidate` rejects no/wrong secret (401), succeeds with the right one
  - [x] Sitemap index + per-locale posts sitemaps generate
- [ ] Not yet tested (needs a live Cloudflare account): real D1/R2 provisioning, production deploy, custom domain, real ISR cache-hit behavior at the edge, Lighthouse/CWV on the deployed URL
- [ ] Not yet done: email provider wiring (verification/reset emails currently log to console only — see `lib/auth/email.ts`), dedicated search engine (currently proxies WordPress's own `?search=`), reading-history/follow-categories/newsletter UI (schema exists, no UI yet)
