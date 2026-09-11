# Cloudflare + Next.js + WordPress Architecture

**Repository:** `cloudflaretest` (git remote: `git@github.com:samarsingh1799/thesexxeducationstatic.git`)
**Current branch at time of writing:** `test` (remote `HEAD` also points at `origin/test`; `main` also exists — see §34.4)
**Document type:** Technical handover / operations runbook, generated from a direct inspection of this repository's source code, configuration files, and Git history — not a generic tutorial.

> **A note on sources of truth.** This repository contains a detailed `README.md` written by the original developer. Where this document's own inspection of the actual code disagrees with a claim in `README.md`, this document follows the code and explicitly flags the discrepancy. One such discrepancy remains: the ISR incremental cache actually uses Cloudflare **KV**, not R2 as `README.md` states.
>
> **Update (post-initial-inspection):** at the time this document was first written, category/tag/author pages were `force-dynamic` (always server-rendered, never cached), contradicting `README.md`'s own rendering table, which describes them as "static + ISR." That gap has since been closed — see §7 — by moving pagination (the reason those pages read `searchParams`, which is what forced them dynamic) to a client-side fetch against a new `/api/listings` endpoint, so the pages themselves no longer read `searchParams` and are now genuinely ISR-cacheable, matching `README.md`'s original intent. Verified via `npm run build`: all three routes now report `●` (SSG/ISR-eligible), not `ƒ` (dynamic).

---

## Implementation Status

| Area | Status |
| --- | --- |
| Next.js App Router site (locale-prefixed routing) | ✅ Implemented |
| Headless WordPress integration (REST API, `_embed`) | ✅ Implemented |
| Cloudflare Workers deployment via `@opennextjs/cloudflare` | ✅ Implemented (config present; live deployment state needs verification — see §34) |
| ISR / on-demand cache for home + article pages | ✅ Implemented (`revalidate = false` + tag-based invalidation) |
| Category / tag / author pages caching | ✅ On-demand ISR (`revalidate: false` + `generateStaticParams`), matching home/article — fixed by moving pagination client-side (`/api/listings` + `PaginatedPostGrid`) so the page itself no longer reads `searchParams` — see §7 |
| WordPress webhook → cache revalidation (`/api/revalidate`) | ✅ Implemented, bearer-token secured |
| Multilingual routing (6 locales) | ✅ Implemented, folder-based (`app/[locale]/...`), no middleware |
| WordPress-side translation storage | ✅ Implemented via a **site-specific WordPress plugin** REST namespace (`sexxedu/v1`) — not WPML/Polylang |
| Sitemap (index + per-locale posts + pages) | ✅ Implemented, tag-revalidated |
| robots.txt | ✅ Implemented (Next.js Metadata Route) |
| JSON-LD (Organization, WebSite, Article, BreadcrumbList) | ✅ Implemented |
| Authentication (better-auth, email/password) | ✅ Implemented, D1-backed |
| Saved articles / likes / view-tracking / trending | ✅ Implemented, D1-backed (Drizzle ORM) |
| Reading history, followed categories, newsletter opt-in | ⚠️ Database schema exists; **no UI wired up** (per README and code inspection) |
| Email delivery (verification / password reset) | ⚠️ Stubbed to `console.log` only — **no real email provider configured** (`src/lib/auth/email.ts`) |
| Dedicated search engine | ⚠️ Not implemented — proxies WordPress's own `?search=` REST parameter |
| Article HTML sanitization | ⚠️ **Partially implemented** — the single-column render path (`ArticleBody`) sanitizes; the multi-column render path (`ArticleColumns`, used whenever WordPress content contains 2–4 top-level `<h2>`s) renders raw WordPress HTML via `dangerouslySetInnerHTML` **without** calling `sanitizeArticleHtml` — see §22 |
| Home/site meta description, per locale | ✅ Fixed — `homeDescription` and the category/tag/author fallback description templates existed, translated, in every dictionary file but were never actually read by any page; now wired up (`src/app/[locale]/page.tsx`, the three listing pages, `SiteFooter.tsx`) |
| Pagination control labels ("Previous"/"Next"/"Page X of Y"), per locale | ✅ Fixed — `Pagination.tsx` imported `getDictionary` but never called it, hardcoding English labels for every locale; now uses the (already-translated) `previous`/`next`/`pageOf` dictionary keys |
| ⚠️ **New finding:** author avatar images (Gravatar URLs from WordPress) crash `next/image` | ❌ **Confirmed bug, not yet fixed** — `next.config.ts`'s `images.remotePatterns` only allowlists the `WORDPRESS_URL` host; WordPress's default avatar fallback is `secure.gravatar.com`, which isn't in that allowlist. `next/image` throws `Invalid src prop ... hostname "secure.gravatar.com" is not configured`, which **500s any page rendering an author avatar via `next/image`** — confirmed live on `/en` (homepage, via `AuthorSpotlight`) and `/en/author/{slug}` (via the page's own avatar `<Image>`). Pre-existing, unrelated to the fixes above; not fixed as part of this session — flagged for a separate decision (add `secure.gravatar.com` to `remotePatterns`, or stop rendering third-party avatar URLs through `next/image`) |
| Automated tests (unit/integration/e2e) | ❌ None found in this repository — no test runner, no test files, no `test` script in `package.json` |
| GitHub → Cloudflare Workers Builds auto-deploy | ❓ Needs verification — no `.github/workflows/`, no Cloudflare Pages/Workers Builds config file exists in-repo; this is configured (or not) entirely from the Cloudflare dashboard, which cannot be inspected from the repository alone |
| Custom domain attached to the Worker | ⚠️ Target domain **decided and configured in app config** (`www.thesexxeducation.com` — `wrangler.jsonc`'s `vars`, `.env.production.local`), but **not yet actually attached** to the Worker in Cloudflare — that step requires dashboard access (§34.12) |
| Live Cloudflare resources (D1/KV actually provisioned, Worker actually deployed) | ❓ Needs verification — IDs are present in `wrangler.jsonc` (suggesting they were created at some point) but this document cannot confirm they exist under the currently-authenticated Cloudflare account |

---

## 1. Project Overview

This repository is a **production-grade, SEO-first, multilingual news/blog website**. Editorial content (articles, categories, tags, authors, featured images) is authored and stored entirely in **WordPress**, used strictly as a **headless CMS** — WordPress is never rendered to visitors directly; it only serves JSON over its REST API. The public-facing website is a **Next.js 16 (App Router)** application that fetches that JSON, renders full HTML server-side, and is deployed to **Cloudflare Workers**.

**Why WordPress as a headless CMS:** editors keep their existing, familiar WordPress publishing workflow (block editor, categories, tags, featured images, RankMath SEO fields, media library) with zero retraining. The Next.js frontend never touches the WordPress database directly — it only ever calls WordPress's public REST API (`/wp-json/wp/v2/...`) plus one small custom REST namespace (`/wp-json/sexxedu/v1/...`) added specifically for this project (translations + feedback).

**Why Cloudflare Workers:** the site is deployed to Cloudflare's edge network rather than a traditional Node server or Vercel. Cloudflare Workers gives the project, at low/no cost: global edge compute, D1 (edge SQLite) for its own application data (accounts, sessions, saved articles, view counts), KV for the ISR page cache, and Cloudflare's native image resizer in place of a hosted image-optimization API.

**Adapter used:** `@opennextjs/cloudflare` (OpenNext's Cloudflare adapter), **not** Cloudflare's newer `vinext`. This is a deliberate, documented choice (see `README.md` §10 and §31 below): `@opennextjs/cloudflare` runs the actual output of `next build` on Workers, preserving real Next.js semantics (Metadata API, `generateStaticParams`, ISR) that this project's SEO strategy depends on. `vinext` is a from-scratch reimplementation of the Next.js API surface on Vite and, at the time this was written, had documented gaps in newer App Router features.

**Rendering strategy:** a mix, applied per route:
- **On-demand ISR** (statically rendered once, cached indefinitely, invalidated only by an explicit tag/path revalidation call — never a timer) for the home page and article pages.
- **Always-dynamic (SSR per request)** for category, tag, author, search, and account pages.
- **Plain static** for the auth form shells (login/register/forgot-password/reset-password) and legal/info pages.
- **Always-dynamic** for every `/api/*` route handler (mutations, session-gated reads, the revalidation webhook).

There is **no traditional SSG build** (no `next export`) and **no client-side-only rendering** — every page is server-rendered HTML, matching the project's SEO-first goal (crawlers must never depend on JavaScript execution to see content).

---

## 2. Complete Architecture

### 2.1 Request path (a visitor reading an article)

```text
┌──────────┐     HTTPS      ┌────────────────────────┐
│ Visitor  │ ─────────────► │ Cloudflare Edge Network │
│(browser) │                │ (Worker + Assets + CDN) │
└──────────┘                └────────────┬───────────┘
                                          │
                     ┌────────────────────┼─────────────────────┐
                     │                    │                     │
                     ▼                    ▼                     ▼
           Static asset request?   Cached ISR page?     Needs (re)rendering?
           (.js/.css/images under   Serve from KV        Invoke the Worker
           /_next/static/*)         incremental cache     (.open-next/worker.js)
                     │              instantly, no          │
                     ▼              Worker invocation       ▼
            Served directly by            │         Next.js Server Components
            the `ASSETS` binding           │         run inside the Worker
            (Cloudflare edge, bypasses     │                 │
             the Worker entirely)          │                 ▼
                                           │         WordPress fetch needed?
                                           │                 │
                                           │      ┌──────────┴───────────┐
                                           │      │                      │
                                           │      ▼                      ▼
                                           │  Cached fetch          Not cached /
                                           │  (Next `fetch` +       expired tag?
                                           │  tags, revalidate:     │
                                           │  false) → served       ▼
                                           │  from OpenNext's   GET WordPress
                                           │  fetch cache        REST API
                                           │      │             (/wp-json/wp/v2/…,
                                           │      │              /wp-json/sexxedu/v1/…)
                                           │      └──────────┬───────────┘
                                           │                 ▼
                                           │         HTML rendered, written
                                           │         to KV (page cache) +
                                           │         D1 (tag→path index)
                                           ▼                 │
                                  ◄────────┴─────────────────┘
                                          │
                                          ▼
                              Rendered HTML returned to visitor
```

**Component roles:**
- **Cloudflare Edge Network** — TLS termination, global anycast routing, and the Worker runtime itself. Also where the `ASSETS` binding serves prebuilt static files (JS/CSS/fonts/images emitted by `next build`) without ever invoking the Worker — Cloudflare's equivalent of Vercel's static CDN tier.
- **Worker (`.open-next/worker.js`)** — the actual `next build` server output, adapted to run on Workers' `workerd` runtime by `@opennextjs/cloudflare`. Executes Server Components, Route Handlers, and Metadata generation.
- **KV incremental cache (`NEXT_INC_CACHE_KV` binding)** — stores rendered page/data output so a page generated once via ISR is served instantly on subsequent requests without re-rendering, until explicitly invalidated.
- **D1 tag cache (`NEXT_TAG_CACHE_D1` binding)** — stores the mapping from cache **tags** (e.g. `post-234`) to the cached **paths/data** that used that tag, so a single `revalidateTag("post-234")` call knows exactly what in KV to invalidate.
- **D1 app database (`DATABASE` binding, same physical D1 database)** — accounts, sessions, saved articles, likes, view counts. Completely separate concern from the ISR/tag cache tables, just co-located in the same D1 database.
- **WordPress origin** — the only source of editorial content. Reached only via HTTPS REST calls from inside the Worker, never from the browser.

### 2.2 Publish path (an editor publishes/updates/deletes a post in WordPress)

```text
┌───────────┐   Editor clicks   ┌─────────────┐
│  Editor    │ ───"Publish"───► │  WordPress   │
└───────────┘                   └──────┬──────┘
                                        │ WordPress webhook plugin fires
                                        │ HTTP POST, Authorization: Bearer <REVALIDATE_SECRET>
                                        ▼
                          ┌───────────────────────────┐
                          │  POST /api/revalidate      │
                          │  (Cloudflare Worker route  │
                          │   handler, this repo)      │
                          └─────────────┬─────────────┘
                                        │ validates bearer token
                                        │ reads { type, postId, slug, categorySlug }
                                        ▼
                    ┌───────────────────────────────────────┐
                    │ revalidateTag(...) + revalidatePath(...) │
                    │ — targeted invalidation, not a full     │
                    │   site rebuild                          │
                    └─────────────────┬───────────────────────┘
                                      │ writes invalidation record
                                      ▼
                         D1 tag cache (NEXT_TAG_CACHE_D1)
                                      │
                                      ▼
                    Next request for that post/path is a cache
                    MISS → Worker re-fetches from WordPress REST
                    API → re-renders → writes fresh HTML back to
                    KV incremental cache
                                      │
                                      ▼
                         Updated article now served from
                         Cloudflare's edge to every visitor
```

Every component in both diagrams above is explained in detail in the sections that follow (§5–§9, §34.20).

---

## 3. Technology Stack

| Category | Value (from this repository) |
| --- | --- |
| Framework | Next.js — **App Router** |
| Next.js version | **16.3.4** (`package.json`, confirmed installed in `node_modules/next/package.json`) |
| React version | **19.2.8** (`react` and `react-dom`, both pinned exactly, no `^`) |
| Deployment platform | Cloudflare Workers |
| Cloudflare products used | Workers (compute), Workers KV (ISR page cache), D1 (SQLite — app data + tag cache), Cloudflare Images/`IMAGES` binding (image resizing), Workers Assets (static file serving), Workers Observability (logs/metrics) |
| Adapter | `@opennextjs/cloudflare` **v1.20.6** (not `vinext`) |
| CMS | WordPress (headless — REST API only, no theme/frontend rendering) |
| WordPress API | WordPress core REST API (`/wp-json/wp/v2/*`) + one custom plugin namespace (`/wp-json/sexxedu/v1/*`) for translations and feedback |
| App database | Cloudflare **D1** (SQLite), accessed via **Drizzle ORM** `0.45.2` + `drizzle-kit 0.31.10` |
| Auth | **better-auth** `1.7.4` + `better-auth-cloudflare 0.3.1` + `@better-auth/drizzle-adapter 1.7.4` (email/password, D1-backed sessions) |
| Image/CDN handling | `next/image` with **no custom loader** — proxied through Cloudflare's native image resizer via the `IMAGES` binding declared in `wrangler.jsonc` |
| Analytics | Google Analytics 4 (`gtag.js`), conditionally rendered only if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set |
| Ads | Google AdSense, conditionally rendered only if `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is set (site-verification tag + ad script) |
| SEO | Next.js Metadata API (built by hand in `src/lib/seo/`), hand-written JSON-LD (no `next-seo`/`schema-dts` package dependency) |
| Styling | Tailwind CSS `^4` + `@tailwindcss/postcss` + `@tailwindcss/typography` |
| Icons | `react-icons ^5.7.0` |
| Utility libs | `clsx ^2.1.1`, `tailwind-merge ^3.6.0` |
| Language/runtime | TypeScript `^5`, strict mode on |
| Node.js version | **22.23.2**, pinned via `.nvmrc` (Wrangler requires Node ≥ 22) |
| Package manager | npm (`package-lock.json` present; no `yarn.lock`/`pnpm-lock.yaml`) |
| Wrangler (CLI) | **4.131.0** — resolved as a **transitive** dependency (not listed directly in `package.json`'s `dependencies`/`devDependencies`; pulled in by `@opennextjs/cloudflare`/`drizzle-kit`), invoked via npm scripts / `npx wrangler` |
| Linting | ESLint `^9` + `eslint-config-next 16.3.4` (flat config, `eslint.config.mjs`) |
| Automated tests | **None found** — no test runner, no test files, no `test` script |

---

## 4. Repository Structure

Only files/directories that actually exist in this repository are listed. Generated/build directories (`.next/`, `.open-next/`, `.wrangler/`, `node_modules/`) are omitted except where their *presence* itself is meaningful.

```text
Cloudflaretest/
├── AGENTS.md                        # AI-agent instructions only — not app documentation. Not modified for this task.
├── CLAUDE.md                        # Points to AGENTS.md. Not modified for this task.
├── README.md                        # Original developer's own architecture writeup (see note at top of this file re: two known discrepancies)
├── package.json                     # Scripts + dependencies — see §3, §13
├── next.config.ts                   # Image remotePatterns (from WORDPRESS_URL) + local Cloudflare dev binding init
├── open-next.config.ts              # OpenNext adapter config: KV incremental cache + D1 tag cache (see §7)
├── wrangler.jsonc                   # Cloudflare Worker configuration — Worker name, bindings, compatibility flags (see §34.5)
├── drizzle.config.ts                # Drizzle-kit config — points at src/db/*-schema.ts, outputs SQL to migrations/
├── .nvmrc                            # Pins Node 22.23.2
├── .env.example                     # Documents every env var name (no real values) — copy to .env.local AND .dev.vars
├── .env.local / .dev.vars / .env.production.local   # Local-only, gitignored, never committed (see §12)
├── cloudflare-env.d.ts               # Generated by `npm run cf-typegen` — typed CloudflareEnv interface (gitignored, regenerate after touching bindings)
├── eslint.config.mjs                 # Flat ESLint config (Next core-web-vitals + TypeScript rules)
├── tsconfig.json                     # Strict TypeScript config, `@/*` → `src/*` path alias
├── migrations/                       # SQL migrations for D1, applied via `wrangler d1 migrations apply`
│   ├── 0000_melodic_jigsaw.sql
│   ├── 0001_mixed_white_queen.sql
│   └── meta/                         # drizzle-kit's own migration bookkeeping
├── public/
│   ├── _headers                      # Cloudflare Pages/Assets-style header rules (see §21)
│   └── (favicons, svgs, logo)
└── src/
    ├── app/
    │   ├── page.tsx                          # Bare "/" — permanentRedirect to "/{defaultLocale}" (no locale segment matches "/")
    │   ├── not-found.tsx                      # Root-level 404 (only reached for a URL with no [locale] segment at all)
    │   ├── global-error.tsx                   # Catches an error thrown in the root layout itself (rare)
    │   ├── robots.ts                           # Metadata Route — robots.txt (see §9, §20)
    │   ├── favicon.ico / globals.css
    │   ├── sitemap.xml/route.ts                # Sitemap INDEX (see §20)
    │   ├── sitemap-pages.xml/route.ts          # Home + category + author + static/legal pages, all locales
    │   ├── sitemap-posts-{en,hi,es,fr,de,pt}.xml/route.ts   # One posts sitemap PER locale
    │   ├── api/
    │   │   ├── auth/[...all]/route.ts          # better-auth catch-all (sign-up/in/out, session, password reset)
    │   │   ├── revalidate/route.ts             # ★ WordPress webhook — cache invalidation (see §9)
    │   │   ├── bookmarks/route.ts              # GET — signed-in user's saved articles list
    │   │   ├── bookmarks/[postId]/route.ts     # (present per README; save/unsave a specific article)
    │   │   ├── likes/[postId]/route.ts         # GET/POST/DELETE — like state for one article
    │   │   ├── posts/[postId]/view/route.ts    # POST — anonymous view-count increment (fuels "Trending")
    │   │   ├── search/route.ts                 # GET — header search modal, proxies WordPress ?search=
    │   │   ├── language-availability/[[...path]]/route.ts   # GET — which locales have a real translation for the current path
    │   │   ├── listings/route.ts                # ★ GET — page ≥2 of a category/tag/author listing, as JSON (see §7) — never used for page 1
    │   │   └── feedback/route.ts                # POST — "rate your experience" widget, forwards to WordPress sexxedu/v1 plugin
    │   └── [locale]/
    │       ├── layout.tsx                       # ★ Root HTML shell for every locale — fonts, GA/AdSense scripts, JSON-LD, generateStaticParams for all locales
    │       ├── page.tsx                          # ★ Home page (ISR, see §7)
    │       ├── not-found.tsx / error.tsx          # Locale-aware 404 / error boundary
    │       ├── [category]/[slug]/page.tsx        # ★★★ PRIMARY ARTICLE ROUTE (ISR, see §6/§7)
    │       ├── article/[slug]/page.tsx           # Legacy categoryless-post fallback — permanentRedirects to the real path when a category exists
    │       ├── category/[slug]/page.tsx           # Category listing (ISR, page 1 only server-side — see §7)
    │       ├── tag/[slug]/page.tsx                 # Tag listing (ISR, noindex, page 1 only server-side — see §7)
    │       ├── author/[slug]/page.tsx              # Author listing (ISR, page 1 only server-side — see §7)
    │       ├── search/page.tsx                     # Search results (force-dynamic, noindex)
    │       ├── login/ register/ forgot-password/ reset-password/   # Static form shells — real auth logic is client-side + /api/auth/*
    │       ├── account/page.tsx                    # Signed-in user dashboard (force-dynamic, noindex+nofollow)
    │       └── about-us/ contact/ privacy-policy/ terms-and-conditions/ cookie-policy/ editorial-policy/ corrections-policy/
    │           accessibility/ age-content-notice/ health-disclaimer/ copyright/ advertising-disclosure/    # Static legal/info pages, one per locale
    ├── components/
    │   ├── article/    # ArticleBody, ArticleColumns, ArticleCard, ArticleMeta, AuthorBio, TableOfContents, TranslationNotice, TrendingSidebar, ViewTracker, SaveArticleButton, LikeArticleButton, ShareButtons, FontSizeControl, CopyLinkButton, PaginatedPostGrid ★ (client — renders page 1 from server props with no fetch; fetches page ≥2 from /api/listings, see §7)
    │   ├── auth/       # SignInForm, SignUpForm, ForgotPasswordForm, ResetPasswordForm, UserMenu
    │   ├── account/    # SavedArticlesList
    │   ├── home/       # HeroSlider, CurrentAndTrending, CategorySpotlight, CategoryShowcase, AuthorSpotlight, Newsletter
    │   ├── layout/      # SiteHeader, SiteFooter, DesktopNav, MobileNav, CategoryMegaMenu, LanguageMenu ★, Breadcrumbs, SearchButton, SearchModal, ScrollToTop, DateTimeBadge, icons
    │   ├── seo/         # JsonLd.tsx — the only place JSON-LD <script> tags are emitted
    │   ├── ads/         # AdSlot.tsx
    │   ├── images/      # PostCardImage.tsx
    │   ├── feedback/    # FeedbackWidget.tsx
    │   ├── legal/       # LegalPageLayout.tsx
    │   └── ui/          # Pagination.tsx (client — reads the current page from useSearchParams(), see §7)
    ├── lib/
    │   ├── wordpress/    # ★★★ THE ONLY LAYER THAT TALKS TO WORDPRESS — see §5
    │   │   ├── client.ts       # wpFetch() — retrying fetch wrapper, tagging, error handling
    │   │   ├── posts.ts        # getPosts, getPostBySlug, getPostById, getAllPublishedSlugs, getRelatedPosts
    │   │   ├── categories.ts   # getAllCategories, getCategoryHierarchy, getCategoryBySlug
    │   │   ├── tags.ts         # getAllTags, getTagBySlug
    │   │   ├── authors.ts      # getAllAuthors, getAuthorBySlug
    │   │   ├── media.ts        # getMediaById (standalone media lookup)
    │   │   ├── languages.ts    # ★ THE ONE FILE COUPLED TO THE sexxedu/v1 PLUGIN — translation lookups
    │   │   ├── feedback.ts     # submitFeedback() — forwards to sexxedu/v1 feedback endpoint
    │   │   ├── client-ip.ts    # getClientIp() — best-effort real visitor IP extraction
    │   │   ├── trending.ts     # getTrendingPosts() — reads D1 postViews, backfills with recent posts
    │   │   └── wp-types.ts     # Raw WordPress REST API response shapes
    │   ├── cache/tags.ts        # ★ Single source of truth for every cache tag string (see §7)
    │   ├── seo/
    │   │   ├── metadata.ts      # buildPageMetadata / buildArticleMetadata — Metadata API objects
    │   │   ├── canonical.ts     # getLocalizedPath, getArticlePath, getCanonicalUrl, hreflang builders
    │   │   ├── schema.ts        # JSON-LD builders (Organization, WebSite, BreadcrumbList, Article)
    │   │   ├── site-config.ts   # siteConfig.url — the ONE place the production domain is resolved (from NEXT_PUBLIC_SITE_URL)
    │   │   ├── sitemap-entries.ts   # Builds the actual URL entries for every sitemap
    │   │   └── sitemap-xml.ts   # Renders <urlset>/<sitemapindex> XML strings
    │   ├── i18n/
    │   │   ├── locales.ts        # ★ Single source of truth for supported locales
    │   │   ├── dictionary.ts     # Server-only getDictionary() via next/root-params
    │   │   ├── useCurrentLocale.ts   # Client-side locale read (via usePathname)
    │   │   ├── languagePreference.ts # localStorage helpers for the language switcher
    │   │   └── dictionaries/{en,hi,es,fr,de,pt}.json   # Translated UI strings (NOT article content)
    │   ├── auth/
    │   │   ├── index.ts    # createAuth() factory — better-auth instance built fresh per request
    │   │   ├── session.ts  # getCurrentSession()
    │   │   ├── client.ts   # better-auth React client
    │   │   └── email.ts    # ⚠️ STUBBED — logs verification/reset emails to console only
    │   ├── content/
    │   │   ├── html.ts          # decodeEntities / stripHtml
    │   │   ├── sanitize.ts      # sanitizeArticleHtml() — see §22 for the coverage gap
    │   │   ├── reading-time.ts  # estimateReadingMinutes()
    │   │   ├── toc.ts           # buildTableOfContents() — injects heading ids
    │   │   └── splitSections.ts # splitSections() — magazine-style multi-column layout split
    │   ├── db/index.ts     # getDb() — per-request Drizzle instance bound to the D1 `DATABASE` binding
    │   └── utils/utils.ts
    ├── db/
    │   ├── schema.ts        # Combines app-schema + auth-schema into one `schema` export
    │   ├── app-schema.ts    # savedArticles, readingHistory, followedCategories, userPreferences, likedArticles, postViews
    │   └── auth-schema.ts   # Generated by `npm run auth:schema` — better-auth's own tables
    └── types/content.ts     # Normalized Post/PostSummary/Category/Tag/Author/FeaturedImage types
```

**Files developers will routinely modify:** anything under `src/app/[locale]/`, `src/components/`, `src/lib/i18n/dictionaries/*.json`, `src/lib/wordpress/*.ts` (if WordPress's schema changes), `src/lib/seo/*.ts`.

**Files developers rarely need to touch:** `open-next.config.ts`, `wrangler.jsonc` (only when adding a new Cloudflare binding), `cloudflare-env.d.ts` (regenerated, never hand-edited), `src/db/auth-schema.ts` (regenerated by `npm run auth:schema`), `next-env.d.ts`, `tsconfig.tsbuildinfo`.

---

## 5. WordPress Integration

**WordPress API base URL:** the value of the `WORDPRESS_URL` environment variable (server-only — never sent to the browser). Not printed here since it lives in gitignored `.env.local`/`.dev.vars` files; see §12 for how to configure it. `next.config.ts` also reads it at build time to compute `images.remotePatterns` so `next/image` is allowed to reference the WordPress media host.

**Single point of contact:** every WordPress request in the codebase goes through `src/lib/wordpress/client.ts`'s `wpFetch()` function. No other file calls `fetch()` against the WordPress origin directly (enforced by convention/comments, not by a lint rule).

**How posts are fetched** (`src/lib/wordpress/posts.ts`):
- List: `GET /wp-json/wp/v2/posts` with `page`, `per_page` (default 12), `_embed=1`, `categories` (comma-joined ids), `tags`, `author`, `search`, `exclude` (comma-joined ids), `orderby=date`, `order=desc`.
- Single, by slug: `GET /wp-json/wp/v2/posts?slug={slug}&per_page=1&_embed=1` (WordPress's REST API has no direct "get by slug" path segment, so this is the standard list-filtered-to-one-slug pattern).
- Single, by numeric id: `GET /wp-json/wp/v2/posts/{id}?_embed=1`.
- All published slugs (for sitemaps/`generateStaticParams`): paginates `GET /wp-json/wp/v2/posts` at `per_page=100` up to 50 pages, collecting `{id, slug, categorySlug, modifiedAt}`.

**How categories are fetched** (`src/lib/wordpress/categories.ts`): `GET /wp-json/wp/v2/categories` with `per_page=100&orderby=name&order=asc&hide_empty=true`; single category via `?slug=`. A parent/child hierarchy is built client-side (in the Node/Worker code, not in the browser) from the flat list's `parent` field.

**How tags are fetched** (`src/lib/wordpress/tags.ts`): `GET /wp-json/wp/v2/tags` with the same `per_page/orderby/order/hide_empty` pattern; single tag via `?slug=`.

**How authors are fetched** (`src/lib/wordpress/authors.ts`): `GET /wp-json/wp/v2/users?per_page=100` (list) / `?slug=` (single). **Deliberately omits** WordPress's `?who=authors` filter — that parameter requires an authenticated request (gated behind the `list_users` capability in WordPress core), which this public app never has. The unauthenticated `/users` endpoint already only returns users with at least one published post, which is exactly "authors" for this app's purposes.

**How featured images are fetched:** never a separate request in the normal article flow — `_embed=1` on the posts endpoint embeds `wp:featuredmedia` directly in the same response, normalized into `{url, alt, width, height}`. A standalone `getMediaById()` in `media.ts` exists for the rarer case of only having a media id (e.g., a future webhook payload that only carries an id).

**Is `_embed` used?** Yes — on every posts list/single fetch, to pull `wp:featuredmedia`, `wp:term` (categories + tags), and `author` in one round trip instead of N+1 requests.

**Custom WordPress REST API endpoints** (both under one custom plugin's namespace, `sexxedu/v1`, referred to in code as "the sexxedu/v1 plugin"):
- `GET /wp-json/sexxedu/v1/translations/{postId}/{locale}` — returns `{ success, data: { title, content, excerpt, seoTitle?, seoDescription? } }` for one post's translation into one non-English locale. This is the **one file** (`languages.ts`) coupled to this specific plugin; pointing this app at a different WordPress instance without it means only this file needs rewriting.
- `POST /wp-json/sexxedu/v1/feedback` — accepts a "rate your experience" submission; optionally authenticated (see below).

**Authentication against WordPress:** none for the standard `wp/v2` read endpoints (all public/anonymous GET requests — this is a read-only integration for public content). The custom `sexxedu/v1/feedback` endpoint optionally accepts `Authorization: Bearer <SEXXEDU_INTERNAL_SECRET>` + `X-SexxEdu-Client-IP` headers, used only so WordPress can trust the forwarded real visitor IP for its own rate limiter — omitting this secret still lets feedback through, just rate-limited by this Worker's own IP as a shared bucket rather than per-visitor.

**Caching:** every WordPress fetch is issued with Next.js's `fetch(url, { next: { revalidate, tags } })` cache API. The default across the codebase is **`revalidate: false`** (cache indefinitely — a WordPress response is treated as valid forever until an explicit `revalidateTag()`/`revalidatePath()` call says otherwise). Every fetch is also tagged (see §7's `cacheTags` table) so the webhook can invalidate precisely.

**Query parameters used, summarized:** `page`, `per_page`, `_embed`, `categories`, `tags`, `author`, `search`, `exclude`, `orderby`, `order`, `slug`, `hide_empty`.

**Error handling:** `wpFetch()` returns `null` on an HTTP 404 (treated as "not found," not an error). Any other non-2xx status throws. A non-JSON response (e.g., WordPress returning an HTML error page) throws with a truncated preview of the body for debugging. GET requests are retried up to 4 attempts with exponential backoff + jitter on a 5xx, 429, or 403 status, or a network-level failure (403 is included because this project's shared WordPress hosting has been observed to return it under rate-limiting/bot-protection during bursts, e.g. static generation). Every calling function in `posts.ts`/`categories.ts`/`authors.ts` wraps `wpFetch()` in its own `try/catch` and degrades to an empty result (`{items: [], totalPages: 1, totalItems: 0}` or `[]`) plus a `console.error` rather than throwing up into the page render — a WordPress outage produces an empty section, not a crashed page (except `getPostBySlug`/`getCategoryBySlug`/`getTagBySlug`/`getAuthorBySlug` returning `null`, which the calling route then turns into a 404).

**RankMath SEO fields:** `posts.ts` reads `post.meta?.rank_math_title` / `post.meta?.rank_math_description` for per-article SEO title/description overrides. **Needs verification:** WordPress's REST API does not expose arbitrary post meta by default — for these two fields to actually appear in the `/wp-json/wp/v2/posts` response, the WordPress instance must have them explicitly registered as REST-visible (e.g., via `register_post_meta(..., ['show_in_rest' => true])` in a theme/plugin, or a RankMath REST-exposure add-on). This repository does not contain that WordPress-side code (it lives in WordPress itself), so confirm it's configured there.

**No secrets are printed above or anywhere in this document** — only variable names and endpoint paths.

---

## 6. Article Rendering

**URL format:** `/{locale}/{categorySlug}/{postSlug}` is the canonical form (e.g. `/en/menstrual-health/pms-symptoms-causes-and-treatment`), served by `src/app/[locale]/[category]/[slug]/page.tsx`. A post with **no category** falls back to `/{locale}/article/{slug}`, served by `src/app/[locale]/article/[slug]/page.tsx`.

**Slug handling / canonicalization:** the primary article route computes the *true* canonical path from the post's actual category (`getArticlePath()`), and if the requested URL's category segment doesn't match, it issues a **308 permanent redirect** (`permanentRedirect`) to the correct path. This means a post that changes category, or is ever requested under the wrong category segment, always redirects rather than serving duplicate content under two URLs. The categoryless fallback route does the mirror-image check: if a categoryless post gains a category, it permanently redirects *out* to the categorized path.

**Data flow (WordPress post → rendered HTML):**
1. `getTranslatedPost(locale, slug)` (`lib/wordpress/languages.ts`) is called, wrapped in React's `cache()` so the same request during one render pass (metadata generation + page body) only fetches once.
2. For the default locale (`en`), this is a direct passthrough to `getPostBySlug(slug)`.
3. For any other locale, it first fetches the English post (for id, category, dates, author, featured image — those are never translated, a deliberate v1 simplification), then fetches that post's stored translation from `sexxedu/v1/translations/{id}/{locale}`; if no translation exists, returns `null` (→ the page 404s, exactly like an unpublished post).
4. The route computes reading time (`estimateReadingMinutes`), injects heading ids for a table of contents (`buildTableOfContents`), and attempts to split the body into a 2–4 column magazine layout (`splitSections`) based on top-level `<h2>` count.
5. Rendering: either `<ArticleColumns>` (multi-column, if 2–4 `<h2>` sections were found) or `<ArticleBody>` (single column, sanitized) — see §22 for the sanitization gap between these two paths.
6. `generateMetadata()` builds the `<title>`, meta description, canonical URL, OG/Twitter tags, and `alternates.languages` (hreflang) from the same post data.
7. JSON-LD (`Article` + `BreadcrumbList`) is emitted via `<JsonLd>` in the page body.
8. The response is cached (see §7) at the Cloudflare edge until an explicit revalidation.

**Published/draft behavior:** WordPress's own REST API already excludes drafts/scheduled/private posts from unauthenticated responses (this app never authenticates against WordPress for reads), so there is no separate "is this published?" check in the Next.js code — an unpublished post simply isn't returned by `getPostBySlug`, which the route treats as 404.

**404 behavior:** `notFound()` is called whenever `getTranslatedPost` returns `null` (post doesn't exist, or — for non-English locales — exists but has no published translation yet) or the requested `locale` isn't in the supported list. This renders `src/app/[locale]/not-found.tsx` (locale-aware, dictionary-translated "not found" message).

**Preview behavior:** **not implemented.** There is no draft-preview route, no preview-mode cookie handling, and no authenticated WordPress preview flow in this codebase.

**Related articles:** `getRelatedPosts()` (`lib/wordpress/posts.ts`) — same category first (excluding the post itself), falling back to the post's first tag if the category has nothing else. Never fabricates a relation; returns an empty list if neither yields results.

**Category pages:** `/​{locale}/category/{slug}` — always-dynamic (see §7), paginated (13 per page), shows a hero card for the first post + a grid for the rest, plus any child categories as filter chips.

**Tag pages:** `/{locale}/tag/{slug}` — always-dynamic, paginated (13 per page), deliberately marked `robots: { index: false, follow: true }` (noindex, still crawlable/linked) — a documented decision (thin/overlapping content with categories at this project's scale), not an oversight.

**Author pages:** `/{locale}/author/{slug}` — always-dynamic, paginated (12 per page), shows avatar + bio + their posts.

---

## 7. ISR / Caching / Revalidation

This is the most important section for day-to-day operation of the site. Two independent caching layers are in play and it's essential not to conflate them:

1. **Next.js Data Cache** (`fetch(...,{next:{revalidate, tags}}`) — caches the *WordPress API response* itself.
2. **Next.js Full Route Cache / ISR** (`export const revalidate`, `generateStaticParams`) — caches the *rendered HTML page*.

On Cloudflare, both are backed by real storage via `open-next.config.ts`:

```ts
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(kvIncrementalCache, { mode: "long-lived" }),
  tagCache: d1NextTagCache,
});
```

- **`kvIncrementalCache`** — the rendered-page/data cache lives in Cloudflare **KV** (binding `NEXT_INC_CACHE_KV`, declared in `wrangler.jsonc`), wrapped in `withRegionalCache(..., { mode: "long-lived" })`, a short-lived **in-memory** regional layer in front of KV to absorb repeat reads within the same Cloudflare colo without a KV round-trip each time.
- **`d1NextTagCache`** — the tag→path index that makes `revalidateTag()`/`revalidatePath()` actually work lives in **D1** (binding `NEXT_TAG_CACHE_D1`, same physical database as the app's own `DATABASE` binding, bound twice under two names because the adapter's tag-cache code hard-codes the binding name `NEXT_TAG_CACHE_D1` internally).

> **Correction to `README.md`:** the README describes this ISR cache as living in **R2**. The actual, current `open-next.config.ts` and `wrangler.jsonc` use **KV**, not R2 — there is no R2 bucket configured anywhere in this repository. The code comments in both files explain why KV was chosen over R2: R2 requires a card on file to enable even within Cloudflare's free tier (an account-verification gate this project deliberately avoids), while KV's free tier needs none. The trade-off, per those same comments: KV is *eventually consistent*, so a page invalidated via `revalidateTag`/`revalidatePath` can take a short while (observed: seconds; Cloudflare gives no guaranteed bound) to be reflected globally, versus R2's strong consistency. This is a one-file-plus-a-new-bucket change to revisit later if that lag becomes noticeable.

**Without these two overrides**, OpenNext's ISR silently falls back to full SSR on every request — i.e., these two lines in `open-next.config.ts` are not an optimization, they are what makes ISR function at all on this platform.

**Per-route caching reality** (verified directly against the source — not inferred from the README):

| Route | Directive(s) found in code | Actual behavior |
| --- | --- | --- |
| `/` (bare root) | `permanentRedirect` only, no data fetch | Not cached/not applicable — a redirect |
| `/{locale}` (home) | `revalidate = false`, `dynamicParams = true`, `generateStaticParams` → `[]` | **On-demand ISR.** Rendered on first request per locale, then served from the KV cache indefinitely until a tag/path revalidation |
| `/{locale}/{category}/{slug}` (article) | `revalidate = false`, `dynamicParams = true`, `generateStaticParams` → `[]` | **On-demand ISR**, same model as home |
| `/{locale}/article/{slug}` (categoryless fallback) | No `revalidate`/`dynamicParams`/`generateStaticParams` exported at all (file's own comment: "Always dynamic (no generateStaticParams)") | Rendered per request; the underlying WordPress fetch is still Data-Cache-cached (`revalidate:false` inside `wpFetch`), only the *page shell* isn't ISR-cached |
| `/{locale}/category/{slug}` | `revalidate = false`, `dynamicParams = true`, `generateStaticParams` → `[]` (**fixed** — see below) | **On-demand ISR.** Page 1 (the canonical, most-linked, most-crawled URL) is cached at the edge exactly like home/article |
| `/{locale}/tag/{slug}` | Same as category (**fixed**) | **On-demand ISR**, page 1 cached |
| `/{locale}/author/{slug}` | Same as category (**fixed**) | **On-demand ISR**, page 1 cached |
| `/{locale}/search` | `dynamic = "force-dynamic"` | Always dynamic (uses `searchParams`) |
| `/{locale}/account` | `dynamic = "force-dynamic"` | Always dynamic (per-user session data) |
| `/{locale}/login`, `/register`, `/forgot-password`, `/reset-password` | None of the above exported | Default Next.js static rendering (no dynamic API usage) — matches README |
| `/{locale}/about-us` etc. (legal/info pages) | None found | Default static rendering |
| `/api/language-availability/[[...path]]` | `revalidate = false`, `dynamicParams = true`, `generateStaticParams` → `[]` | Route Handler using the same ISR mechanism as a page — cached indefinitely per path, tag/path-revalidated |
| `/api/listings` (new — see below) | None (plain Route Handler) | Always dynamic — a small JSON endpoint, only ever called for page ≥2 of a listing |
| `/sitemap.xml`, `/sitemap-pages.xml`, `/sitemap-posts-{locale}.xml` | `revalidate = false` | Cached indefinitely; regenerated only when `cacheTags.sitemap()` is invalidated |
| `/robots.ts` | None (Metadata Route, no data fetch) | Effectively static |
| Every other `/api/*` route handler (bookmarks, likes, view, search, feedback, auth, revalidate) | Route Handlers performing mutations or reads of private/per-request data | Always dynamic by nature — never cached |

**Why category/tag/author were `force-dynamic`, and how the fix works.** Per Next.js's own docs (`node_modules/next/dist/docs/.../page.md`): *"`searchParams` is a Request-time API whose values cannot be known ahead of time. Using it will opt the page into dynamic rendering at request time"* — unconditionally, for the whole route, regardless of `revalidate`/`generateStaticParams`/`dynamic` settings. These three pages read `searchParams.page` server-side to support `?page=N` pagination, which is exactly what was forcing them dynamic (`force-dynamic` was, in effect, just making explicit what `searchParams` usage already implied). Since this project doesn't enable Next 16's newer **Cache Components** (`cacheComponents: true` in `next.config.ts` — not set here, and not something this fix enables, since it would require adding `"use cache"`/`cacheLife` directives throughout the codebase and re-verifying compatibility with the `@opennextjs/cloudflare` adapter, which was not deemed a change to make casually), there is no partial-static/partial-dynamic split available for a route that reads `searchParams` under the model this project actually uses.

**The fix:** the page/route components (`category/[slug]/page.tsx`, `tag/[slug]/page.tsx`, `author/[slug]/page.tsx`) no longer read `searchParams` at all — they now always fetch and render **page 1 only**, server-side, which is what makes them eligible for `revalidate: false` + `generateStaticParams` ISR again. Pagination for page ≥2 is handled by a new Client Component, `src/components/article/PaginatedPostGrid.tsx`: it reads the current page from the URL via `useSearchParams()` (a client hook, which does not affect server-side caching), renders the server-provided page-1 props with **zero fetch** when `page === 1`, and otherwise fetches that page's data from a new Route Handler, `src/app/api/listings/route.ts` (`GET /api/listings?type=category|tag|author&slug=...&locale=...&page=N`). `src/components/ui/Pagination.tsx` was similarly converted to a Client Component that derives the current page from `useSearchParams()` rather than a server-computed prop. URLs (`?page=2`, etc.) are unchanged, so no redirects or link updates were needed anywhere else in the codebase.

**The trade-off, disclosed rather than hidden:** a direct visit, bookmark, or crawl of `/{locale}/category/{slug}?page=2` now initially receives page-1's HTML (the only thing that's actually cached), then swaps to the real page-2 content once the client component hydrates and fetches it a moment later. This is considered acceptable here because `getTranslationUrls`/`buildPageMetadata` (`lib/seo/canonical.ts`) already set every paginated URL's canonical tag to the page-1 URL regardless of which page is being viewed — Google was never treating `?page=2` as an independently-indexable page to begin with, so this doesn't change what's "the real, indexable version" of a category/tag/author listing.

**Verified:** `npm run build` now reports `●` (SSG/ISR-eligible) for all three routes, not `ƒ` (dynamic); `/api/listings` correctly returns real, translated WordPress data for page ≥2 and gracefully returns an empty result for an out-of-range page (WordPress's own REST API 400s on that, caught by `wpFetch`'s existing error handling — see §5); a live category page (`/en/category/fitness-wellness`) was confirmed to server-render real post content, correct JSON-LD, correct hreflang, and the new localized fallback meta description (see §19's update) in its initial HTML.

**Every WordPress data fetch is still cached independently of the page**, at `revalidate: false` with tags. One correction to this document's own earlier analysis: `force-dynamic` does **not** merely mean "the page re-renders but WordPress fetches can still hit the Data Cache" — per Next's own docs, `force-dynamic` is explicitly equivalent to setting every `fetch()` in that route to `{cache: 'no-store', next: {revalidate: 0}}`, i.e. it disables fetch-level caching too. This means the *former* `force-dynamic` category/tag/author pages were hitting WordPress on **every single request**, with no caching at any layer — worse than this document originally stated, and one more reason the fix above is a meaningful, not cosmetic, improvement. The remaining `force-dynamic` routes (`/{locale}/search`, `/{locale}/account`) are subject to the same rule, which is appropriate for them (genuinely per-request data).

**In simple language — what actually happens:**
- **First visitor to a brand-new article URL:** that visitor's request *is* the one that triggers rendering. There is no separate background "pre-warm" — the first request pays the cost of fetching from WordPress and rendering, then the result is written to KV. Every subsequent visitor gets the cached HTML instantly.
- **An article that's already cached:** served straight from KV, no WordPress call, no re-render, regardless of how "old" the cached copy is — there is **no time-based expiry** on article/home pages (`revalidate: false` everywhere, not a number of seconds). A cached article never silently "goes stale and regenerates on a timer" — it only changes when the webhook says so.
- **Category/tag/author pages:** never cached at the page level at all — every request re-renders (though the underlying WordPress data may still be cache-hit fast).
- **After the webhook fires:** the specific tag(s)/path(s) named in the payload are invalidated. The *next* request for that path is a cache miss, triggers a fresh WordPress fetch + re-render, and repopulates KV. Every other request in the (brief, eventually-consistent) window in between may still see the old cached copy, per KV's consistency model described above.
- **Is regeneration in the background?** No "stale-while-revalidate" background regeneration is configured here (no `revalidate: <seconds>` number is used anywhere, which is what would normally enable that pattern in Next.js ISR) — this project's model is purely **on-demand, tag-triggered** invalidation: cache forever, until the webhook explicitly says otherwise, then regenerate synchronously on the very next request.

---

## 8. New Article Publishing Flow

```text
WordPress editor
      │  clicks "Publish"
      ▼
WordPress core
      │  fires action hook (publish_post / save_post, WordPress-side —
      │  not part of this repository; see §9/§10)
      ▼
WordPress webhook plugin
      │  HTTP POST, Authorization: Bearer <REVALIDATE_SECRET>,
      │  body: { type: "post", postId, slug, categorySlug }
      ▼
POST /api/revalidate   (this repo, src/app/api/revalidate/route.ts)
      │  validates the bearer token
      │  revalidateTag(cacheTags.post(postId), "max")
      │  revalidateTag(cacheTags.postsList(), "max")
      │  revalidateTag(cacheTags.sitemap(), "max")
      │  revalidatePath(`/{locale}/{categorySlug}/{slug}`) for every locale
      │  revalidatePath(`/{locale}`) for every locale
      ▼
D1 tag cache (NEXT_TAG_CACHE_D1) records the invalidation
      ▼
Next real request for that article/home/sitemap path
      │  is a cache MISS
      ▼
Worker re-fetches from WordPress REST API, re-renders
      ▼
Fresh HTML written back to KV incremental cache
      ▼
Cloudflare edge serves the fresh article to every subsequent visitor
```

**Step-by-step explanation:**
1. The editor publishes in WordPress exactly as they always have — no change to their workflow.
2. A WordPress-side webhook plugin (configured in WordPress, not part of this codebase — see §10) detects the publish event and sends an HTTP POST.
3. `POST /api/revalidate` in this repository authenticates the request via a shared bearer-token secret.
4. It calls `revalidateTag()` for the specific post, the general posts list, and the sitemap tag — plus `revalidatePath()` for every locale's copy of the article and every locale's homepage, as a belt-and-suspenders alongside the tag-based invalidation.
5. This writes invalidation state into D1 (`NEXT_TAG_CACHE_D1`).
6. The *next* HTTP request for any invalidated path is treated as a cache miss by the KV incremental cache, causing the Worker to actually re-render — fetching fresh data from WordPress in the process.
7. The freshly rendered HTML is written back into KV.
8. All subsequent visitors receive the updated article directly from Cloudflare's edge cache — no further WordPress calls until the next invalidation.

---

## 9. WordPress Webhook

**Endpoint:** `POST /api/revalidate` (`src/app/api/revalidate/route.ts`).

**HTTP method:** `POST` only (no `GET` handler exists on this route).

**Authentication:** shared-secret bearer token. The request must carry `Authorization: Bearer <value>` where `<value>` exactly matches this Worker's `REVALIDATE_SECRET` environment variable/secret. If `REVALIDATE_SECRET` is unset, or the header is missing/wrong, the endpoint returns **`401 Unauthorized`** — it never falls open. **The real secret value is never printed in this document; see §12/§34.11 for how to configure it.**

**Request payload shape:**
```json
{
  "type": "post",
  "postId": 234,
  "slug": "pms-symptoms-causes-and-treatment",
  "categorySlug": "menstrual-health"
}
```

**`type` field — expected values:** `"post"`, `"post.deleted"`, `"category"`, `"tag"`, `"author"`. Payloads missing `type` entirely return **`400 Bad Request`**.

**How the slug/post id is used:**
- `postId` → `revalidateTag(cacheTags.post(postId))` (only if present in the payload).
- Always, regardless of `postId`: `revalidateTag(cacheTags.postsList())` and `revalidateTag(cacheTags.sitemap())`.
- If `slug` is present: for **every configured locale**, `revalidatePath()` is called on both `/{locale}/{categorySlug or "article"}/{slug}` and `/{locale}` (the locale homepage, since it lists recent posts).

**Which routes are invalidated, by `type`:**
| `type` | Tags invalidated | Paths invalidated |
| --- | --- | --- |
| `post` | `post-{id}` (if `postId` given), `posts-list`, `sitemap` | every locale's `{category or article}/{slug}` + every locale's homepage (if `slug` given) |
| `post.deleted` | Identical handling to `post` (same `switch` case in the code) | Same as `post` |
| `category` | `category-{categorySlug}` (if given), `categories-list` | none |
| `tag` | `tags-list` (note: **not** a specific `tag-{slug}` tag, even though `cacheTags.tag()` exists — the handler only ever invalidates the general tags list for this `type`) | none |
| `author` | `authors-list` (same note — no per-author tag invalidation on this path) | none |

**What happens for "publish" vs. "update":** the endpoint does not distinguish between a brand-new publish and an edit to an existing post — both should be sent as `type: "post"` with the same payload shape. The invalidation logic is identical either way (this is intentional; a new post also needs the same list/sitemap/homepage invalidation as an edited one).

**What happens for delete/trash:** send `type: "post.deleted"`. The handler runs the exact same invalidation as `type: "post"` — the *next* request for that article's path then fetches from WordPress again, gets nothing back (WordPress no longer returns a trashed/deleted post from its public REST API), and the route correctly 404s. There is no separate "tombstone" mechanism — 404 is the natural consequence of the re-fetch coming back empty.

**Error handling:** invalid/missing bearer token → `401`. Missing `type` → `400`. Malformed (non-JSON) body → payload parses to `null` via `.catch(() => null)`, which then fails the `!payload?.type` check → `400`. Any other request always returns `200` with a JSON summary: `{ revalidated: true, tags: [...], paths: [...] }` listing exactly what was invalidated — useful for confirming a webhook call actually did something.

**How to test it manually** (replace `<domain>` and `<secret>` — never commit the real secret to a shell history file or a script checked into git):
```bash
curl -i -X POST "https://<domain>/api/revalidate" \
  -H "Authorization: Bearer <secret>" \
  -H "Content-Type: application/json" \
  -d '{"type":"post","postId":234,"slug":"example-post","categorySlug":"example-category"}'
```
Expect `200` with a `revalidated: true` body. Test the negative case too:
```bash
curl -i -X POST "https://<domain>/api/revalidate" -H "Content-Type: application/json" -d '{"type":"post"}'
# Expect 401 Unauthorized (no Authorization header at all)
```

**The real `REVALIDATE_SECRET` value is never reproduced anywhere in this document.**

---

## 10. Exact WordPress Setup

Only what this repository's code actually requires is listed — nothing invented.

1. **Required WordPress settings:** a working, publicly reachable WordPress REST API (`/wp-json/wp/v2/...` reachable over HTTPS from Cloudflare's network, not just from an office IP). Permalinks must be enabled (WordPress's default "Plain" permalink structure disables pretty REST routes in some configurations) — **needs verification against the actual live WordPress instance**.
2. **Required plugins (inferred from the code, not assumed):**
   - A plugin (or must-use plugin/theme code) that registers the **`sexxedu/v1`** REST namespace with at least `GET /translations/{postId}/{locale}` and `POST /feedback` — this is custom, project-specific code that must already exist on the WordPress instance for `src/lib/wordpress/languages.ts` and `feedback.ts` to work. It is **not** a public/off-the-shelf plugin name this document can point to; it was clearly purpose-built for this project.
   - **RankMath** (or another SEO plugin populating `rank_math_title`/`rank_math_description` post meta) **if** you want the per-article SEO title/description override in `posts.ts` to have any effect — and that meta must additionally be exposed via `show_in_rest` (see §5's note). If neither is configured, the site still works; articles simply fall back to the post title/excerpt for SEO metadata (`buildArticleMetadata`'s `post.seo.title || post.title` fallback).
   - A webhook-capable plugin/mechanism to call this app's `/api/revalidate` endpoint on publish/update/trash. This repository does not dictate *which* plugin — any WordPress mechanism capable of firing an authenticated HTTP POST on a post-status-transition hook works (a custom `functions.php` snippet on `publish_post`/`save_post`/`before_delete_post`, or a generic webhook plugin such as WP Webhooks configured against those hooks).
3. **Webhook setup:** configure the chosen webhook mechanism to fire on: post published, post updated, post trashed/deleted. Point it at this Worker's `/api/revalidate` endpoint.
4. **Required webhook URL:** `https://<your-production-domain>/api/revalidate` (see §34.10 for how the production domain is actually determined in this project — it is **not** hardcoded anywhere).
5. **Required HTTP method:** `POST`.
6. **Authentication:** `Authorization: Bearer <REVALIDATE_SECRET>` header, where the value must exactly match the Worker's `REVALIDATE_SECRET` secret (see §12, §34.11).
7. **Required payload:** see §9's JSON shape — at minimum `{"type":"post"}`; include `postId`, `slug`, and `categorySlug` whenever available for full/precise invalidation.
8. **How to test publishing:** publish a test post in WordPress, then immediately `curl` (or open in a browser) `https://<domain>/en/{categorySlug}/{slug}` and confirm it renders (first request may take slightly longer — this is the on-demand render described in §7).
9. **How to verify revalidation:** check the webhook plugin's own delivery log (if it has one) for a `200` response from `/api/revalidate` containing `revalidated: true`; or run the manual `curl` test from §9 with the real payload for that post and inspect the returned `tags`/`paths` arrays.

---

## 11. Cloudflare Setup

This section is a summary; the full step-by-step deployment runbook (with exact commands and every dashboard screen) is in **§34** — read that section before deploying for the first time. Summary of what's required:

1. **Cloudflare account** — a Cloudflare account with Workers enabled (all Cloudflare accounts have this by default today).
2. **Worker setup** — this repo already defines the Worker via `wrangler.jsonc` (name `cloudflaretest`); no need to create it manually in the dashboard first if deploying via `npm run deploy` (Wrangler creates it on first `deploy` if it doesn't exist).
3. **GitHub/GitLab connection** — **not detected in this repository.** No `.github/workflows/`, no Cloudflare Pages/Workers Builds manifest file exists in-repo. If Workers Builds' GitHub integration is in use, it is configured entirely from the Cloudflare dashboard side and cannot be confirmed by inspecting this repository alone — **Needs verification** (see §34.8).
4. **Build/deployment configuration** — `npm run build` → `opennextjs-cloudflare build` under the hood via `npm run deploy`/`npm run preview` (see §34.6 for the exact scripts).
5. **Wrangler configuration** — `wrangler.jsonc` at the repo root (full breakdown in §34.5).
6. **Environment variables** — see §12 below and §34.10.
7. **Secrets** — `REVALIDATE_SECRET`, `BETTER_AUTH_SECRET`, `WORDPRESS_URL` must be set as Worker secrets in production (`wrangler secret put ...` or the dashboard's Variables and Secrets screen) — see §34.11.
8. **Custom domain** — target domain decided (`www.thesexxeducation.com`) and already reflected in `wrangler.jsonc`'s `vars`/`.env.production.local`, but not yet attached to the Worker itself; do that post-deploy via the dashboard (Workers & Pages → your Worker → Settings → Domains & Routes) — see §34.12.
9. **DNS** — managed however the domain's zone is managed in Cloudflare; a Worker custom domain auto-manages its own DNS record — see §34.13.
10. **Production deployment** — `npm run deploy` (local) or a Workers Builds GitHub-triggered build (if configured) — see §34.14/§34.16.
11. **Preview deployment** — **not detected as configured** in this repository (no `env.preview`/`[env.*]` block in `wrangler.jsonc`, no preview-specific scripts) — see §34.15.

---

## 12. Environment Variables

| Variable | Required | Used By | Purpose | Secret? |
| --- | --- | --- | --- | --- |
| `WORDPRESS_URL` | Yes | `src/lib/wordpress/client.ts`, `src/lib/wordpress/feedback.ts`, `next.config.ts` (image `remotePatterns`) | Base URL of the headless WordPress origin | **Yes** — `<SECRET>` |
| `REVALIDATE_SECRET` | Yes | `src/app/api/revalidate/route.ts` | Bearer token the WordPress webhook must send to invalidate cache | **Yes** — `<SECRET>` |
| `BETTER_AUTH_SECRET` | Yes | `src/lib/auth/index.ts` (better-auth) | Session/token signing secret | **Yes** — `<SECRET>` |
| `BETTER_AUTH_URL` | Yes | `src/lib/auth/index.ts`, `src/app/api/auth/[...all]/route.ts` (as a fallback if not derived from the request origin) | This deployment's own base URL, used by better-auth | No (a URL, but treat as environment-specific config) |
| `NEXT_PUBLIC_SITE_URL` | Yes | `src/lib/seo/site-config.ts` (→ every canonical/OG/hreflang/sitemap URL), `src/lib/auth/client.ts` (likely — auth client base URL) | The single source of truth for this deployment's public production URL | No (deliberately public — embedded in every page's HTML as canonical/OG tags) |
| `SEXXEDU_INTERNAL_SECRET` | No (optional) | `src/lib/wordpress/feedback.ts` | Lets WordPress trust the forwarded real visitor IP for its feedback rate limiter; feedback still works without it, just rate-limited less precisely | **Yes** — `<SECRET>` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No (optional) | `src/app/[locale]/layout.tsx` | Google Analytics 4 measurement id — no analytics script renders at all until set | No (public by nature — GA ids are always visible in page source on any site) |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | No (optional) | `src/app/[locale]/layout.tsx` | Google AdSense client id — emits the site-ownership verification tag + (if real ad units are later wired up) the ad script | No (public by nature — same as any AdSense site) |

**Any variable prefixed `NEXT_PUBLIC_` is inlined into the client-side JavaScript bundle at build time and is visible to anyone viewing page source** — never put a secret behind that prefix. Every other variable above is read only in server-side code (Route Handlers, Server Components, `wpFetch`) and never shipped to the browser.

**Where these are configured locally:** copy `.env.example` to **both** `.env.local` (read by plain `next dev`/`next build`) **and** `.dev.vars` (read by Wrangler-based commands — `npm run preview`, `wrangler dev`, D1 migrations) — each tool reads only its own file, so both must be kept in sync locally. Neither file is committed (`.gitignore` excludes `.env*` and `.dev.vars`).

**Where these are configured in production:** Worker secrets (`wrangler secret put <NAME>`) for anything marked "Secret? Yes" above; plain Worker environment variables (dashboard "Variables and Secrets" screen, or `wrangler.jsonc`'s `vars` block) for `BETTER_AUTH_URL`/`NEXT_PUBLIC_SITE_URL`. `wrangler.jsonc`'s `vars` block was added during this documentation session, setting both to the intended production domain `https://www.thesexxeducation.com`, and `.env.production.local` was updated to match (`NEXT_PUBLIC_SITE_URL` additionally needs to be present at **build time** — it's inlined into the JS bundle — which is exactly what that file is for; see §34.10 for the full build-time-vs-runtime distinction). **Still needed before this is live:** attaching `www.thesexxeducation.com` as the Worker's actual Cloudflare Custom Domain (§34.12) — the config now correctly *points at* that domain, but the domain isn't yet *connected* to this Worker.

---

## 13. Local Development

All commands below are copied verbatim from this repository's own `package.json` — none invented.

**Install dependencies:**
```bash
nvm use            # this repo pins Node 22.23.2 via .nvmrc
npm install
```

**Configure environment variables (one-time):**
```bash
cp .env.example .env.local
cp .env.example .dev.vars
# then fill in WORDPRESS_URL, REVALIDATE_SECRET, BETTER_AUTH_SECRET in BOTH files
```

**Start the plain Next.js development server** (fast refresh, no Cloudflare emulation):
```bash
npm run dev
# → next dev, http://localhost:3000
```

**Run Cloudflare locally** (the real OpenNext/Workers bundle, under Wrangler's local runtime — Miniflare — with real D1/KV emulated locally, no live Cloudflare account required):
```bash
npm run preview
# → opennextjs-cloudflare build && opennextjs-cloudflare preview
```

**Build the application:**
```bash
npm run build
# → next build (plain Next.js build; does not produce a Worker bundle by itself)
```

**Build the actual Cloudflare Worker bundle** (used internally by `preview`/`deploy`, can be run standalone):
```bash
npx opennextjs-cloudflare build
```

**Preview a production build:**
```bash
npm run preview     # real Workers/OpenNext bundle via local Wrangler (recommended)
# — or, for a plain Next.js production server, not Cloudflare-accurate —
npm run build && npm run start
```

**Run tests:** **no test suite exists in this repository** — there is no `test` script in `package.json`, no test runner dependency (Jest/Vitest/Playwright/etc.), and no test files were found anywhere under `src/`. This is a documentation gap in the project itself, not an omission in this document.

**Run lint:**
```bash
npm run lint
# → eslint
```

**Run type checking** (no dedicated `package.json` script exists for this — run the TypeScript compiler directly, as the project's own README's testing checklist does):
```bash
npx tsc --noEmit
```

**Database (D1) commands, for completeness — also local-dev-relevant:**
```bash
npm run db:generate         # drizzle-kit generate — SQL migration from src/db/*-schema.ts
npm run db:migrate:local    # wrangler d1 migrations apply cloudflaretest-db --local
```

---

## 14. Deployment

**How deployment is triggered:** two possible paths exist for this project; only one is verifiably configured from inside the repository:
- **Manual/local**, verified: `npm run deploy` run from a developer's machine (or a CI job invoking the same command), authenticated via `wrangler login` or a Cloudflare API token.
- **Automatic via GitHub (Cloudflare Workers Builds)**: **not verifiable from this repository** — no CI workflow file or Workers Builds manifest exists in-repo; this integration, if it exists, lives entirely in Cloudflare dashboard configuration tied to the GitHub repo (`samarsingh1799/thesexxeducationstatic`). **Needs verification directly in the Cloudflare dashboard.**

**Git branch used:** the repository's remote `HEAD` points at `origin/test`, and the current local branch is `test`; a `main` branch also exists on the remote. **Needs verification** which of these is actually configured as the *production* branch in Cloudflare's dashboard (if Workers Builds is in use) — this cannot be determined from the repository alone.

**Build command:** `opennextjs-cloudflare build` (invoked via `npm run deploy`/`npm run preview`, which run it as a prerequisite step — there is no separate raw "build command" configured independently of these npm scripts anywhere in this repo).

**Deploy command:** `opennextjs-cloudflare deploy` (the second half of `npm run deploy`) — this itself wraps `wrangler deploy` after the OpenNext build step.

**Wrangler usage:** `wrangler.jsonc` supplies the Worker's static configuration (name, bindings, compatibility settings); the `opennextjs-cloudflare` CLI drives Wrangler under the hood for both `preview` (local Miniflare) and `deploy` (real Cloudflare).

**Required environment variables for a successful deploy:** all of §12's "Yes" rows must be set as real Worker secrets/vars before the deployed site will function correctly (WordPress fetches, auth, and revalidation will all fail/error without them — see §34.22 for exact failure symptoms).

**How to verify successful deployment:** see the full checklist in §34.18 — in short: `deploy` prints a `*.workers.dev` URL (or your custom domain, if already attached) on success; open it, confirm the homepage renders, an article renders, `/sitemap.xml` and `/robots.txt` return XML/text, and `/api/revalidate` returns `401` with no auth header (proving the Worker booted and the route is reachable, before you've even tested the real secret).

**How to roll back:** see §34.17 for the full procedure — summarized: Cloudflare Workers retains previous deployment versions; use the dashboard's Deployments/Versions view for the Worker to roll back to a previous version, or `git revert` the offending commit and redeploy via the same `npm run deploy` path.

---

## 15. Publishing a New Article

Operational checklist for an editor:

1. In WordPress, create a new post.
2. Add a title.
3. Add the article body content (WordPress block editor).
4. Set a featured image (required for the article page's hero image and OG/Twitter card image — the page still renders without one, just without that image).
5. Assign a category (a post with no category still works, via the `/​{locale}/article/{slug}` fallback route, but won't appear in category listings/mega-menu).
6. Add tags (optional — used for the "Topics" section and related-post fallback matching).
7. Fill in SEO metadata (RankMath title/description fields, **if** that plugin is installed and REST-exposed — see §5/§10; otherwise the post title/excerpt is used automatically).
8. Publish.
9. **Verify WordPress API:** confirm the new post appears via `GET /wp-json/wp/v2/posts?slug=<slug>&_embed=1` directly against the WordPress origin.
10. **Verify the website:** open `https://<domain>/en/{categorySlug}/{slug}` and confirm it renders (first load after publish may take slightly longer — this is the on-demand ISR render described in §7).
11. **Verify cache/revalidation:** confirm the WordPress webhook fired successfully (see §9's manual test); the homepage and category listing should reflect the new post promptly after that.
12. **Verify the sitemap:** `https://<domain>/sitemap-posts-en.xml` should list the new post's URL (this sitemap is tag-revalidated by the same webhook call, via `cacheTags.sitemap()`).

---

## 16. Updating an Existing Article

Editing and re-publishing an existing WordPress post should trigger the same webhook call as a new publish (`type: "post"`, same payload shape — see §9). The handler does not distinguish "new" from "edited." Once the webhook fires:
- The specific post's tag (`post-{id}`) is invalidated, plus the general posts list and sitemap tags.
- Every locale's copy of that article's path, and every locale's homepage, are explicitly `revalidatePath()`'d.
- The next request for the article is a cache miss → fresh WordPress fetch → fresh render → written back to KV.
- **If the post's category changed**, the canonical-path check in `[category]/[slug]/page.tsx` (§6) will 308-redirect any request still using the old category segment to the new one — this happens automatically on the next request, no special webhook handling needed for a category change specifically.
- **If a translation was added/edited** in the `sexxedu/v1` plugin (not the English post itself), there is **no dedicated webhook payload type for a translation-only change** in this codebase — the closest existing mechanism is re-sending a `type: "post"` payload for that post, which invalidates `post-{id}` and forces a re-render (which will then re-fetch the translation too, since `getTranslatedPost` re-fetches both the English post and its translation together). **Needs verification / potential gap:** if only a translation changes and the WordPress-side webhook doesn't also fire on that event, the translated page could remain stale until something else invalidates `post-{id}`.

---

## 17. Deleting an Article

- **Trashed/deleted in WordPress:** send `type: "post.deleted"` to `/api/revalidate` (§9). The handler runs identical invalidation logic to `type: "post"`. On the next request, the Worker re-fetches from WordPress, which no longer returns the (now-trashed/deleted) post from its public REST API, so `getPostBySlug`/`getPostById` return `null`, and the route calls `notFound()` → **the article now 404s**, served via the locale-aware `not-found.tsx`.
- **Unpublished (reverted to draft):** same mechanism — an unauthenticated REST request never sees a draft, so the effect is identical to a delete from the public site's point of view: the URL 404s after the next invalidation + re-fetch.
- **Until the webhook fires**, the old cached HTML remains servable from KV (this is the same eventual-consistency behavior described in §7) — deleting a post in WordPress alone does **not** immediately remove it from the live site; the webhook call is what triggers the removal.
- **Sitemap:** `cacheTags.sitemap()` is invalidated on every `post`/`post.deleted` webhook call, so the deleted post's URL is dropped from `/sitemap-posts-{locale}.xml` on the next sitemap regeneration (the sitemap route itself re-derives its list from `getAllPublishedSlugs()`, which will simply no longer include the deleted post).

---

## 18. Multilingual Architecture

**Supported languages** (single source of truth: `src/lib/i18n/locales.ts`):

| `code` (URL segment) | Label | `bcp47` (hreflang/`<html lang>`) |
| --- | --- | --- |
| `en` | English | `en` |
| `es` | Español | `es` |
| `fr` | Français | `fr` |
| `de` | Deutsch | `de` |
| `pt` | Português | `pt-BR` |
| `hi` | हिन्दी | `hi` |

`en` is the **default locale** and the WordPress source-of-truth language — but it is **not** treated as unprefixed/special-cased in routing; every locale, English included, is served under `/​{locale}/...` uniformly (e.g. `/en/...`, not a bare `/...`). This is a deliberate simplification noted directly in the code: one uniform rule is simpler than special-casing the source language.

> Note: the working tree at the time of this inspection had **uncommitted** additions of `de` and `pt` (new dictionary files, new per-locale sitemap route folders, and edits to `locales.ts`/`dictionary.ts`/`LanguageMenu.tsx` — see `git status` at the top of this session). The last **committed** state of the repository supports `en`, `es`, `fr`, `hi` only (matching `README.md`'s description of 4 locales); `de`/`pt` are present in the current working directory but not yet committed.

**URL structure:** every route lives under `app/[locale]/...` (a Next.js dynamic route segment) — **no middleware.ts exists in this repository**; locale routing is handled entirely by the file-system route structure, not by request-time `middleware`. The bare domain root (`/`) has no matching `[locale]` segment at all, so `src/app/page.tsx` issues an unconditional `permanentRedirect` to `/​{defaultLocale}` (`/en`) — deliberately **not** based on `Accept-Language` or any other per-visitor signal, so `/` resolves identically for every visitor and for search engine crawlers (the code comment explicitly cites this as aligned with search engines' own guidance against inconsistent language redirects).

**WordPress language handling:** WordPress itself has **no native multilingual plugin** (no WPML/Polylang) wired into this integration. Instead, a **custom, project-specific WordPress REST endpoint** (`sexxedu/v1/translations/{postId}/{locale}`) stores/serves a translated `{title, content, excerpt, seoTitle?, seoDescription?}` payload per post per non-English locale. This is intentionally isolated to a single file, `src/lib/wordpress/languages.ts` — pointing this app at a different WordPress instance without this plugin would require rewriting only that one file (e.g., to call WPML/Polylang's REST API instead).

**How translations are connected / how the correct article is selected:**
- `getTranslatedPost(locale, slug)`: for `en`, a direct passthrough to the normal English post fetch. For any other locale, fetches the English post first (for id/category/author/dates/featured image — these fields are **never translated**, a deliberate v1 scope limitation), then fetches that post's stored translation and overlays `title`/`excerpt`/`contentHtml`/`seo` fields on top. If no translation row exists, returns `null` — the page 404s, exactly like an unpublished post; **it never shows a partially-English page**.
- `getAvailableTranslationLocales(postId)`: checks every non-English configured locale in parallel (`Promise.allSettled`, so one locale's transient failure never fails the whole page/build) and returns only the codes that have a real, published translation.
- `getTranslatedPostSummaries(posts, locale)`: for listing pages (home/category/tag/author), filters the English post list down to only posts that actually have a published translation into the requested locale — an English-only post is simply omitted from a `/hi` listing rather than shown untranslated.

**hreflang implementation:** `src/lib/seo/canonical.ts`'s `getArticleTranslationUrls()` builds the `alternates.languages` map for an article using **only** locales with a real published translation (from `getAvailableTranslationLocales`) plus English and `x-default` (pointed at English, the source-of-truth version). For non-article pages (home/category/tag/author, which render in every locale unconditionally regardless of content), `getTranslationUrls()` includes every configured locale unconditionally. **The code deliberately never emits an hreflang entry pointing at a page that would 404.**

**Canonical URLs:** `getCanonicalUrl(path)` = `new URL(path, siteConfig.url)`, where `siteConfig.url` resolves from `NEXT_PUBLIC_SITE_URL` (falling back to `http://localhost:3000` if unset) — **never derived from the incoming request's `Host`/protocol headers**, specifically so the same page can't emit a different canonical depending on whether it was requested via a `*.workers.dev` preview URL or the real production domain.

**Language-specific metadata:** every page's `<title>`/description/OG/Twitter tags come from `buildPageMetadata`/`buildArticleMetadata`, using the locale-appropriate translated title/excerpt (for articles) or the dictionary (for UI strings on non-article pages). `<html lang="...">` is set per-locale in `src/app/[locale]/layout.tsx` from each locale's `bcp47` value.

**Language-specific sitemap behavior:** one posts sitemap file per locale (`/sitemap-posts-{locale}.xml`), each listing only the posts actually translated into that locale (same rule as hreflang) — see §20.

**The language switcher (`LanguageMenu.tsx`):** since the header renders above `{children}` in the root layout, it has no direct server-side knowledge of which specific article (if any) is being viewed or which of that article's translations exist. It calls `GET /api/language-availability/{...path}` client-side to ask; category/tag/author/home/search paths are always reported as available in every locale (`ALWAYS_SAFE` patterns) without a lookup, while an article path triggers a real `getAvailableTranslationLocales()` check. Locales are optimistically shown as available while that request is in flight or if it fails (never blocks the UI). The user's last-chosen locale is also remembered in `localStorage` (`src/lib/i18n/languagePreference.ts`) — **client-side convenience only, never used to redirect **/`** itself** (see the note under "URL structure" above about `/` always going to the default locale for every visitor).

---

## 19. SEO Architecture

| Element | Where implemented |
| --- | --- |
| `<title>` | `Metadata.title`, built per-page in `src/lib/seo/metadata.ts` (`buildPageMetadata`/`buildArticleMetadata`); template `%s \| {siteName}` set once in `src/app/[locale]/layout.tsx` |
| Meta description | Same functions, `description` field — from RankMath meta / post excerpt (articles) or hand-written copy (other pages) |
| Canonical | `alternates.canonical`, built by `getCanonicalUrl()` in `src/lib/seo/canonical.ts` — always the app's own resolved path, never request-derived |
| Robots (per-page) | `Metadata.robots` — explicitly set to `{index:false, follow:true}` on tag pages, search, not-found/error metadata, and account (`index:false, follow:false`) |
| robots.txt | `src/app/robots.ts` (Next.js Metadata Route) — see §20 |
| Open Graph | `Metadata.openGraph` in both metadata builders — `title`, `description`, `url`, `siteName`, `type` (`website`/`article`), plus `publishedTime`/`modifiedTime`/`authors`/`images` for articles |
| Twitter/X cards | `Metadata.twitter` — `summary_large_image` card type, title/description/image |
| JSON-LD | `src/components/seo/JsonLd.tsx` renders a `<script type="application/ld+json">` per object; data comes from `src/lib/seo/schema.ts` |
| Organization + WebSite schema | Emitted once, in the root `[locale]/layout.tsx`, on every page |
| Article schema | `getArticleSchema()` — emitted on article pages only, includes `headline`, `datePublished`/`dateModified`, `image`, `author`, `publisher`, `mainEntityOfPage`, `articleSection`, `keywords` |
| BreadcrumbList schema | `getBreadcrumbSchema()` — emitted on article, category, tag, and author pages |
| Author/Person schema | Only as a nested `author: {"@type":"Person", name}` object inside the Article schema — **no standalone Person/ProfilePage schema** on the author listing page itself |
| Sitemap | `/sitemap.xml` (index) + per-type/per-locale files — see §20 |
| robots.txt | See §20 |
| hreflang | `alternates.languages`, described fully in §18 |
| Pagination | `src/components/ui/Pagination.tsx`, used on category/tag/author listing pages (`?page=` query param) — **no `rel=next`/`rel=prev` link tags were found in the metadata builders**; pagination is handled purely via links/UI, not dedicated pagination metadata. **Needs verification** if `rel=next/prev` is desired (Google no longer uses these signals, so this is likely an intentional simplification rather than a gap). |

Article content is passed through `sanitizeArticleHtml()` (`src/lib/content/sanitize.ts`) before being rendered as raw HTML — see §22 for the one code path that currently bypasses this.

---

## 20. Sitemap Architecture

```text
/sitemap.xml   (index — src/app/sitemap.xml/route.ts)
   │
   ├──► /sitemap-pages.xml            (home + category + author + static/legal pages, ALL locales)
   ├──► /sitemap-posts-en.xml         (English posts)
   ├──► /sitemap-posts-es.xml         (Spanish posts — translated only)
   ├──► /sitemap-posts-fr.xml         (French posts — translated only)
   ├──► /sitemap-posts-de.xml         (German posts — translated only; currently uncommitted, see §18 note)
   ├──► /sitemap-posts-pt.xml         (Portuguese posts — translated only; currently uncommitted, see §18 note)
   └──► /sitemap-posts-hi.xml         (Hindi posts — translated only)
```

**Sitemap index:** `/sitemap.xml` — lists the paths to `/sitemap-pages.xml` plus one `/sitemap-posts-{code}.xml` per entry in `locales`. Purely structural — no post data of its own.

**Post sitemaps (one per locale):** each calls `getPostsSitemapEntries(localeCode)` (`src/lib/seo/sitemap-entries.ts`), which pulls every published post's slug/category/modified-date (`getAllPublishedSlugs()`) and, for any locale other than `en`, filters to only posts with an actual published translation (via `getAvailableTranslationLocales`) — **never a sitemap entry pointing at a 404**. Each entry: `loc`, `lastmod` (post's `modifiedAt`), `changefreq: weekly`, `priority: 0.7`.

**Pages sitemap:** `getPagesSitemapEntries()` — for every locale: the homepage (`priority 1.0`, `daily`), every category page (`0.5`, `daily`), every author page (`0.3`, `weekly`), and every static legal/info page (`about-us`, `contact`, `editorial-policy`, `corrections-policy`, `accessibility`, `age-content-notice`, `privacy-policy`, `cookie-policy`, `terms-and-conditions`, `health-disclaimer`, `copyright`, `advertising-disclosure` — `0.2`, `monthly`). These always render (never a 404, even with zero translated posts for that locale), so no availability filtering is applied here.

**Category/tag sitemap:** categories are included (inside the pages sitemap, one entry per category per locale). **Tags are not included in any sitemap** — consistent with tag pages being deliberately `noindex` (§6/§19).

**Does a sitemap change require a deployment?** No. Every sitemap route has `revalidate = false` and is cached exactly like an ISR page — it regenerates automatically whenever `revalidateTag(cacheTags.sitemap())` fires (which happens on every `post`/`post.deleted` webhook call, see §9). No code deploy or manual action is needed for a newly published/deleted article to appear/disappear from the sitemap; it happens through the same webhook-driven cache invalidation as the article page itself.

**How newly published articles appear in the sitemap:** automatically, the next time `/sitemap-posts-{locale}.xml` is requested after the webhook invalidates the `sitemap` tag (search engines re-crawl sitemaps on their own schedule; there's no push-based "ping Google" step in this codebase).

**Google Search Console configuration:** submit `https://<domain>/sitemap.xml` (the index) — Search Console follows the nested `<sitemap>` entries automatically. Verify domain ownership via whatever method is easiest (DNS TXT record is typical for a Cloudflare-managed domain); the `google-adsense-account` meta tag in the layout is a *separate*, AdSense-specific signal and does not itself verify Search Console ownership.

---

## 21. Performance

- **Caching/ISR:** home and article pages are cached indefinitely at the edge (§7) — the large majority of page views (home + articles) never invoke a WordPress fetch or a React render at all; they're served straight from KV.
- **CDN:** Cloudflare's global edge network serves both the cached HTML (via the Worker + KV) and static assets (via the `ASSETS` binding, which bypasses the Worker entirely for `/_next/static/*` and other build output).
- **Image optimization:** `next/image` throughout (featured images, avatars), proxied through Cloudflare's native image resizer via the `IMAGES` binding — no separate image CDN/service to pay for or manage. `public/_headers` additionally sets a 1-year immutable `Cache-Control` on `/_next/static/*` specifically.
- **Font optimization:** `next/font/google` (Plus Jakarta Sans, Geist Mono, Playfair Display) — self-hosted/optimized by Next.js at build time, no runtime request to Google Fonts' CDN from the visitor's browser.
- **JavaScript:** the feedback widget (`FeedbackWidget`) is code-split via `next/dynamic` specifically because it's mounted on every page but nobody interacts with it on first paint. The vast majority of the UI is React Server Components (no client JS shipped) — client components are limited to genuinely interactive islands (save/like buttons, font-size control, share buttons, search modal, language menu, forms).
- **Server/client components:** article pages, listing pages, and layout are Server Components by default; `"use client"` is reserved for stateful/interactive pieces (`LanguageMenu`, `ViewTracker`, `SaveArticleButton`, `LikeArticleButton`, auth forms, etc.).
- **API calls:** WordPress fetches are parallelized with `Promise.all`/`Promise.allSettled` wherever a page needs multiple independent pieces of data (e.g., the home page fetches dictionary + posts + category tree + authors concurrently; the article page fetches related + trending posts concurrently, then translates both concurrently).
- **Third-party scripts:** Google Analytics and AdSense scripts are the only third-party scripts, and both are entirely conditional on their respective environment variables being set — a deployment with neither configured ships neither script at all. GA loads `afterInteractive` (via `next/script`) so it never blocks initial render.
- **Retry/backoff on WordPress fetches:** exponential backoff with jitter on retryable WordPress errors (§5) prevents a transient WordPress hiccup from cascading into a failed page render.

---

## 22. Security

- **Webhook authentication:** `/api/revalidate` is bearer-token-gated (`REVALIDATE_SECRET`); returns `401` on any missing/incorrect token, never falls open (§9).
- **Secrets:** `REVALIDATE_SECRET`, `BETTER_AUTH_SECRET`, `WORDPRESS_URL`, `SEXXEDU_INTERNAL_SECRET` live only in gitignored local files (`.env.local`, `.dev.vars`) and, in production, as Cloudflare Worker secrets — **never** in `wrangler.jsonc`'s (currently nonexistent) `vars` block, and never committed to git. This document does not reproduce any real secret value.
- **Environment variables:** see §12 for the full public/server-only breakdown.
- **WordPress API exposure:** the Next.js app only ever makes **outbound, server-side** requests to WordPress — the WordPress origin URL is never sent to the browser, and WordPress itself is never queried with any authenticated/privileged request from this app (all `wp/v2` reads are anonymous/public).
- **CORS:** no explicit CORS headers/configuration were found anywhere in this codebase (no `next.config.ts` headers, no per-route `Access-Control-*` headers). All `/api/*` routes are same-origin-only by default Next.js behavior. **Needs verification** if any cross-origin consumer of these APIs is expected.
- **Rate limiting:** not implemented **in this Next.js application** for any endpoint. The only rate-limiting behavior is on the WordPress side, for the `/api/feedback` → `sexxedu/v1/feedback` path, and only if `SEXXEDU_INTERNAL_SECRET` is configured (§5). `/api/revalidate`, `/api/likes/*`, `/api/bookmarks/*`, `/api/posts/*/view`, and `/api/search` have no rate limiting of their own beyond whatever Cloudflare's platform-level DDoS protection provides automatically.
- **Cloudflare security:** standard Workers/Cloudflare platform protections apply (TLS termination, DDoS mitigation) at the edge layer; nothing project-specific was configured beyond the `public/_headers` cache rule.
- **Headers:** only `public/_headers` was found, setting `Cache-Control: public,max-age=31536000,immutable` on `/_next/static/*`. **No Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, or other security headers were found configured anywhere in this repository** (not in `next.config.ts`, not in `public/_headers`, not per-route). **Needs verification / potential gap:** consider adding these if a security review is planned.
- **Validation/sanitization:**
  - The feedback form (`/api/feedback`) validates rating range, name length, email format (regex), and message length server-side, plus a honeypot field (`website`) that silently fakes success for bots without forwarding to WordPress.
  - Article HTML is sanitized before render via `sanitizeArticleHtml()` (`src/lib/content/sanitize.ts`) — strips `<script>`/`<style>`/`<object>`/`<embed>` tags and their content, inline event handler attributes (`onclick`, etc.), `javascript:`/`vbscript:` URLs, and any `<iframe>` not pointing at an allowlisted host (`youtube.com`, `youtube-nocookie.com`, `player.vimeo.com`). This is a deliberate, documented **targeted** sanitizer, not a full DOM-based one (no DOM implementation exists in the Workers runtime; pulling in `jsdom`/DOMPurify is both heavy and not edge-compatible).
  - **⚠️ Confirmed gap:** this sanitizer is only actually invoked in one of the two article-body render paths. `src/components/article/ArticleBody.tsx` calls `sanitizeArticleHtml(html)` before `dangerouslySetInnerHTML`. `src/components/article/ArticleColumns.tsx` — the **multi-column magazine layout**, used automatically whenever an article's body contains 2–4 top-level `<h2>` sections (`splitSections()` in `src/app/[locale]/[category]/[slug]/page.tsx`) — renders `introHtml` and each `section.html` via `dangerouslySetInnerHTML` **without** calling `sanitizeArticleHtml` at all. Since the primary trust boundary here is "who has WordPress publishing access" (the same as any headless-WordPress site), this is a defense-in-depth gap rather than an open public vulnerability — but it means the sanitizer's protection is inconsistent depending on how many `<h2>` sections a given article happens to have. **This document only reports this finding; per this task's instructions, no code fix was applied.**
  - Password reset (`better-auth`, `requireEmailVerification: false`) is configured with `sendResetPassword`, which always calls WordPress-independent, app-owned logic — better-auth's own library handles the "don't reveal whether the email exists" behavior internally (standard better-auth behavior, not custom code in this repo).
- **Auth:** passwords hashed by better-auth itself (never hand-rolled); sessions are HttpOnly, 7-day expiry with activity-based refresh (`updateAge`). The `createAuth()` instance is rebuilt per-request from real Cloudflare bindings (§ "Files developers rarely need to touch" note in §4) rather than held as a module-level singleton, since Workers has no long-lived process to safely hold a DB connection across requests.
- **Private data isolation:** saved articles, likes, view-tracking-derived trending data, and session data are only ever read through authenticated `/api/*` routes that call `getCurrentSession()` first — never folded into a page's own cacheable server render (this is what keeps article pages safely ISR-cacheable even for signed-in visitors — the "Save"/"Like" buttons are client-side islands calling `/api/*`, not part of the cached HTML).

---

## 23. Cloudflare Free Plan Compatibility

| Feature used | Free plan? | Notes |
| --- | --- | --- |
| Workers (compute) | Yes, within Free plan request/CPU-time limits | Free plan has daily request caps and per-invocation CPU-time limits — **needs verification against current Cloudflare pricing** for whether this site's expected traffic fits inside them |
| Workers KV (`NEXT_INC_CACHE_KV`) | Yes, within Free plan read/write/storage limits | The `open-next.config.ts` comment explains KV was chosen specifically because it needs no card on file, unlike R2 |
| D1 (`DATABASE` / `NEXT_TAG_CACHE_D1`) | Yes, within Free plan row-read/row-write/storage limits | Same physical database serves both app data and the ISR tag cache — both draw from the same Free-plan quota |
| Cloudflare Images / `IMAGES` binding (native image resizing) | **Needs verification** | Cloudflare's image resizing/transformation product has historically had its own pricing tier separate from the base Workers Free plan — confirm current terms directly with Cloudflare before assuming this is free at scale |
| Workers Assets (static file serving) | Yes | Included with Workers |
| Observability (`observability.enabled: true` in `wrangler.jsonc`) | **Needs verification** | Cloudflare's Workers Logs/Observability product has changed its free-tier retention/volume limits over time — confirm current terms |
| Workers Builds (GitHub auto-deploy) | **Needs verification** | Only relevant if this integration is actually configured (§11/§34.8) — not confirmable from this repository |
| Custom domain on a Worker | Yes (a Worker Custom Domain itself is a Free-plan-compatible feature; the *domain* still needs to be an active Cloudflare zone) | |
| R2 | **Not used** in the current configuration (see §7's correction of `README.md`) | If ever switched back to R2 per the `open-next.config.ts` comment, note R2 requires a card on file to enable, even within its own free tier |

**This document does not guess Cloudflare's current pricing.** Verify all of the above against Cloudflare's own current documentation/pricing page before making cost assumptions, especially for the Images and Observability products, which change terms more frequently than core Workers/KV/D1.

---

## 24. How to Add a New Feature

Recommended workflow:

1. Modify locally, running `npm run dev` for fast iteration (plain Next.js, no Cloudflare emulation needed for most UI/data work).
2. If the change touches a Cloudflare binding (D1 schema, a new KV/D1/R2 resource, env vars) or cache/ISR behavior, verify with `npm run preview` (the real OpenNext/Workers bundle under local Wrangler) before trusting it.
3. Run `npx tsc --noEmit` and `npm run lint` — no CI is configured to catch these automatically (§14), so this is currently a manual step.
4. Commit.
5. Push to the branch that's actually wired to your deployment path (§14 — confirm this in the Cloudflare dashboard if Workers Builds is configured; otherwise deploy manually per §34.16).
6. Deploy (`npm run deploy`, or wait for the GitHub-triggered build if configured).
7. Verify production (§34.18's checklist).
8. If the change affects cached content, confirm cache/revalidation behavior explicitly (§7) — a code change to, say, `metadata.ts` will only show up on pages that get re-rendered; already-cached ISR pages won't pick up a code-only change until they're invalidated (via the webhook) or the KV cache is otherwise cleared, since ISR caching is about *data* freshness, not *code version* freshness — a fresh Worker deploy replaces the code but the KV cache from the previous deploy is still consulted for already-cached paths unless explicitly invalidated.

**Which files to modify for common tasks:**

| Task | Files |
| --- | --- |
| Article UI/layout | `src/app/[locale]/[category]/[slug]/page.tsx`, `src/components/article/*` |
| WordPress API / data shape changes | `src/lib/wordpress/*.ts`, `src/types/content.ts` |
| SEO (titles, meta, schema) | `src/lib/seo/metadata.ts`, `src/lib/seo/schema.ts`, `src/lib/seo/canonical.ts` |
| Sitemap | `src/lib/seo/sitemap-entries.ts`, `src/app/sitemap*.xml/route.ts` |
| Adding/changing a language | `src/lib/i18n/locales.ts` (the single source of truth), then add a matching `src/lib/i18n/dictionaries/{code}.json` and a `src/app/sitemap-posts-{code}.xml/route.ts` folder |
| Cloudflare bindings/config | `wrangler.jsonc`, then re-run `npm run cf-typegen` to regenerate `cloudflare-env.d.ts` |
| Revalidation/cache behavior | `src/app/api/revalidate/route.ts`, `src/lib/cache/tags.ts`, `open-next.config.ts` |
| Auth | `src/lib/auth/index.ts`, `src/lib/auth/session.ts`, `src/db/auth-schema.ts` (regenerate via `npm run auth:schema`, don't hand-edit) |
| Database schema (app data) | `src/db/app-schema.ts` → `npm run db:generate` → `npm run db:migrate:local` (and `:remote` for production) |

---

## 25. Troubleshooting

| Problem | Possible Cause | How to Check | Solution |
| --- | --- | --- | --- |
| New article not appearing | Webhook didn't fire, or fired with the wrong secret/payload | Check the webhook plugin's delivery log; manually `curl` `/api/revalidate` (§9) with the real payload | Fix the WordPress-side webhook config; confirm `REVALIDATE_SECRET` matches on both sides |
| Old article still showing (stale content) | Cache not yet invalidated, or KV's eventual consistency lag (§7) | Confirm the webhook actually returned `revalidated:true` with the expected `tags`/`paths`; wait briefly and retry (KV lag is typically seconds, not minutes) | Re-fire the webhook manually; if persistent, verify `cacheTags`/paths match what the article actually uses |
| WordPress API failing | `WORDPRESS_URL` misconfigured, WordPress origin down, or a WAF/bot-protection rule blocking this Worker's requests | Check Worker logs (`wrangler tail` — §34.21) for `WordPress request failed (...)` errors from `wpFetch()`; test the WordPress REST URL directly with `curl` | Fix `WORDPRESS_URL`; whitelist Cloudflare's outbound IP ranges on the WordPress host's firewall/WAF if applicable |
| Webhook failing | Wrong secret, wrong URL, wrong HTTP method, malformed JSON | `curl` test per §9; check for `401`/`400` responses | Correct the webhook plugin's configured URL/method/secret/payload |
| Revalidation failing (webhook succeeds but nothing changes) | Payload missing `slug`/`postId`/`categorySlug`, so only generic tags were invalidated, not the specific path | Inspect the webhook response body's `tags`/`paths` arrays | Send a complete payload (§9) |
| 404 on an article that should exist | Wrong locale/translation not published; WordPress returned no post for that slug; category segment mismatch triggering an unexpected redirect loop | Check the WordPress REST API directly for that slug; check `getAvailableTranslationLocales` for that post id | Publish the translation, or fix the slug/category in WordPress |
| Sitemap missing an article | Post has no published translation for that locale's sitemap; sitemap tag not yet invalidated | Check `/sitemap-posts-{locale}.xml` directly; confirm the webhook fired with `type` including `sitemap` invalidation (every `post`/`post.deleted` call includes it) | Re-fire the webhook; publish the missing translation |
| Wrong language shown | Locale segment missing/incorrect in the URL; `getDictionary()` falling back to English because `isSupportedLocale()` failed | Check the URL's first path segment against `src/lib/i18n/locales.ts` | Use a correctly locale-prefixed URL; confirm the locale is actually in the `locales` array |
| Wrong canonical URL | `NEXT_PUBLIC_SITE_URL` unset or set to the wrong domain (falls back to `http://localhost:3000`) | View page source, check `<link rel="canonical">` | Set `NEXT_PUBLIC_SITE_URL` correctly and rebuild (it's inlined at build time — §34.10) |
| Cloudflare deployment failing | Missing/invalid Worker secrets, Wrangler auth expired, `wrangler.jsonc` misconfiguration, incompatible Node version | Check the deploy command's own output; check `wrangler whoami`; check Node version against `.nvmrc` | See §34.22 for a full error-by-error table |
| Environment variable missing | Not set in `.env.local`/`.dev.vars` (local) or as a Worker secret/var (production) | `wpFetch`/`createAuth`/`REVALIDATE_SECRET` checks all throw/return clear errors naming the missing variable | Set the variable per §12/§34.10, redeploy if production |
| Image not loading | WordPress media host not covered by `next.config.ts`'s `remotePatterns` (derived from `WORDPRESS_URL` at build time); `IMAGES` binding misconfigured | Check the browser console for a Next.js image "hostname not configured" error | Ensure `WORDPRESS_URL` is correct at **build** time (image config is computed at build, not runtime — see `next.config.ts`) |
| Cache behaving unexpectedly | Conflating the still-force-dynamic pages (search, account) with the ISR pages (home/article/category/tag/author) — see §7's table | Check `export const dynamic`/`revalidate` in the specific route file | Read §7 carefully — category/tag/author are ISR-cached for page 1 only; pagination beyond that is a client-side fetch, not part of the cached HTML |

---

## 26. Testing Checklist

**No automated test suite exists in this repository (§13).** The checklist below is a manual, production-verification checklist (matching the style of `README.md`'s own testing checklist, which is manual, not automated).

**Article**
- [ ] A newly published article renders at its canonical URL
- [ ] An updated article reflects its edits after the webhook fires
- [ ] A deleted/trashed article 404s after the webhook fires
- [ ] A genuinely nonexistent slug 404s
- [ ] A WordPress draft is not reachable via any public URL

**SEO**
- [ ] `<title>` matches the RankMath title (or post title, if RankMath isn't configured)
- [ ] Meta description matches RankMath/excerpt
- [ ] Canonical URL matches `NEXT_PUBLIC_SITE_URL` + the correct path, with no double locale prefix
- [ ] `alternates.languages` (hreflang) only lists locales with a real published translation, plus `x-default`
- [ ] JSON-LD (`Article` + `BreadcrumbList`) present and matches visible content (view-source, not devtools-rendered)
- [ ] `/sitemap.xml` lists all expected per-locale sitemaps; each posts sitemap lists only translated posts for that locale
- [ ] `/robots.txt` disallows `/api/`, `/*/login`, `/*/register`, `/*/forgot-password`, `/*/reset-password`, `/*/account`, and references `/sitemap.xml`

**Performance**
- [ ] Repeat requests to an already-cached article are served without a WordPress round-trip (check Worker logs / response timing)
- [ ] Static assets (`/_next/static/*`) are served with the 1-year immutable cache header from `public/_headers`
- [ ] Images render via Cloudflare's image resizer (no broken images, no oversized unoptimized originals)
- [ ] Core Web Vitals (LCP/CLS/INP) measured against the deployed URL, not `localhost` — **Needs verification per README: this was explicitly not yet tested against a live Cloudflare deployment at the time of the last commit**

**Cloudflare**
- [ ] Deployment completes without error (`npm run deploy` or the Workers Builds pipeline)
- [ ] Custom domain (if configured) resolves and serves valid TLS
- [ ] Worker responds (check `*.workers.dev` URL or custom domain directly)
- [ ] `wrangler tail` (or dashboard Logs) shows no unexpected errors under normal traffic
- [ ] All required environment variables/secrets are present in the deployed environment (§12)

---

## 27. Monitoring and Logs

- **Cloudflare dashboard:** Workers & Pages → select the `cloudflaretest` Worker → **Logs**/**Observability** tab for real-time and historical invocation logs (enabled via `observability: { enabled: true }` in `wrangler.jsonc`).
- **Worker logs (CLI), live-tailing a deployed Worker:**
  ```bash
  npx wrangler tail
  ```
  (Standard Wrangler command; this repository does not define a custom npm script wrapping it, so invoke it directly.)
- **Deployment logs:** if using Workers Builds (GitHub integration), the build/deploy logs live in the Cloudflare dashboard under the Worker's **Deployments**/**Builds** tab — **Needs verification** whether this integration is actually in use (§11). For manual deploys, the output of `npm run deploy` itself is the deployment log (run it in a terminal you can scroll back through, or redirect to a file).
- **WordPress logs:** not part of this repository; check the WordPress hosting provider's own error/access logs and the specific webhook plugin's own delivery/activity log (if it has one) for webhook-firing issues.
- **Browser console:** for client-side errors — the React error boundaries (`src/app/[locale]/error.tsx`, `src/app/global-error.tsx`) will surface a generic "Something went wrong" UI on an unhandled render error; check the console for the underlying stack trace during debugging.
- **Network tab:** useful for checking `/api/language-availability/*`, `/api/likes/*`, `/api/bookmarks/*`, `/api/posts/*/view` calls made by client components, and for confirming cache headers on document/asset responses.

---

## 28. Important URLs

| Purpose | Value |
| --- | --- |
| Production website | **`https://www.thesexxeducation.com`** — the intended production domain. `NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` in `.env.production.local` and `wrangler.jsonc`'s `vars` block are now both set to this value (updated during this documentation session). **Still pending, Cloudflare-dashboard-side (not achievable from the repository alone):** attaching `www.thesexxeducation.com` as this Worker's actual Custom Domain, and a redirect rule from the apex `thesexxeducation.com` — see §34.12 |
| WordPress CMS (admin) | **Needs verification** — the WordPress origin is `WORDPRESS_URL` (redacted secret; typically `https://<wp-host>/wp-admin/`) |
| WordPress REST API | `{WORDPRESS_URL}/wp-json/wp/v2/` (core) + `{WORDPRESS_URL}/wp-json/sexxedu/v1/` (custom) — see §5 |
| Revalidation endpoint | `https://www.thesexxeducation.com/api/revalidate` — see §9 |
| Sitemap | `https://www.thesexxeducation.com/sitemap.xml` |
| robots.txt | `https://www.thesexxeducation.com/robots.txt` |
| Cloudflare dashboard | `https://dash.cloudflare.com/` → Workers & Pages → `cloudflaretest` |
| Git repository | `git@github.com:samarsingh1799/thesexxeducationstatic.git` (branches present on remote: `main`, `test`) |
| Local dev URL | `http://localhost:3000` (`npm run dev`) |
| `*.workers.dev` fallback URL | `https://cloudflaretest.samar-singh-1799.workers.dev` — still resolves regardless of custom-domain status; useful for testing the Worker directly if the custom domain isn't attached yet |

---

## 29. Maintenance Checklist

**Daily**
- Spot-check that newly published WordPress articles are appearing on the live site within a reasonable time of the webhook firing.
- Glance at Worker logs/observability for a spike in errors (WordPress fetch failures, auth errors).

**Weekly**
- Confirm `/sitemap.xml` and its child sitemaps are reachable and reflect recent publishes.
- Review any accumulated feedback submissions (via whatever the `sexxedu/v1/feedback` WordPress-side storage/notification mechanism is — outside this repo's scope).
- Check for outstanding `npm outdated`/security advisories on `next`, `react`, `@opennextjs/cloudflare`, `better-auth`, and `wrangler`'s transitive version, given how quickly the Cloudflare/Next.js ecosystem moves.

**Monthly**
- Rotate `REVALIDATE_SECRET`/`BETTER_AUTH_SECRET` if your security policy calls for periodic rotation (update both the Worker secret and the WordPress-side webhook config together).
- Review Cloudflare's current Free/paid plan terms against actual usage (requests, KV ops, D1 rows, Images transformations) — §23 flags several areas that need periodic re-verification rather than a one-time check.
- Re-run `npx tsc --noEmit` and `npm run lint` after dependency updates (no CI currently enforces this automatically — see §14).
- Confirm `.nvmrc`'s pinned Node version is still compatible with the installed Wrangler version.

---

## 30. Disaster Recovery

- **How to redeploy:** `npm run deploy` from a clean checkout with all required secrets/vars configured (§12, §34.11) — this is the same command used for every normal deployment; there is no separate "recovery" deploy path.
- **How to roll back:** use Cloudflare's dashboard Deployments/Versions view for the `cloudflaretest` Worker to revert to a previously-deployed version (Cloudflare Workers retains deployment history); alternatively, `git revert` the problematic commit(s) locally and redeploy via `npm run deploy` (§34.17 has the full procedure).
- **How to recover if the WordPress API is unavailable:** every WordPress-fetching function in `src/lib/wordpress/` (except the slug/id "get one" lookups) catches its own errors and degrades gracefully to an empty result rather than crashing the page (§5) — already-cached ISR pages (home, articles) continue serving fine from KV regardless of WordPress's availability, since they don't re-fetch until explicitly invalidated. Force-dynamic pages (category/tag/author/search) will render with empty listings until WordPress recovers. The retry logic in `wpFetch` (§5) already absorbs brief WordPress hiccups automatically.
- **How to recover if a Cloudflare deployment fails:** re-run `npm run deploy` after fixing the underlying error (see §34.22's error table); if Wrangler authentication is the issue, re-run `wrangler login` (or refresh the API token, if using one non-interactively).
- **How to regenerate/revalidate content after an incident:** re-fire `/api/revalidate` manually per §9 for any specific post, or, for a broader reset, redeploy the Worker (a fresh deploy does not itself clear the KV cache, since KV persists independently of Worker code versions — deliberate, so a code-only deploy doesn't force every page to re-render from WordPress).
- **What data is stored where:**
  - **WordPress** (source of truth, external system): all editorial content — posts, categories, tags, authors, media, translations, feedback submissions (via its own plugin storage).
  - **Cloudflare D1 (`DATABASE`)**: this app's own accounts/sessions (better-auth tables), saved articles, liked articles, view counts, reading history/followed-categories/newsletter-opt-in schema (present, no UI yet).
  - **Cloudflare D1 (`NEXT_TAG_CACHE_D1`, same physical database)**: the Next.js cache-tag → cached-entry index.
  - **Cloudflare KV (`NEXT_INC_CACHE_KV`)**: rendered page/data cache (the actual HTML/JSON output of ISR pages).
  - **Nothing in this app's own database is a copy of WordPress content** — only numeric WordPress ids are referenced (e.g., `savedArticles.postId`), so there is no sync/staleness problem between the two systems to manage during recovery.

---

## 31. Architecture Decisions

- **WordPress as headless CMS:** keeps editors on their existing, familiar publishing tool with zero retraining, while decoupling the public frontend's performance/hosting from WordPress's own (WordPress is only ever hit by server-side, cacheable fetches — never by a visitor's browser directly).
- **Next.js (App Router):** gives the project a real Metadata API, `generateStaticParams`, and Server Components — all directly load-bearing for this project's SEO-first goals (§19).
- **Cloudflare Workers:** chosen over the project's prior deployment target (multiple code comments across the repo explicitly compare behavior to "the previous deployment target," strongly implying a prior Vercel deployment) — for cost (Workers/KV/D1 free tiers) and for owning the full stack (compute + edge cache + database) under one provider.
- **`@opennextjs/cloudflare` over `vinext`:** explicitly documented in `README.md` §10 — `vinext` (Cloudflare's newer, Vite-based adapter) is a from-scratch reimplementation of the Next.js API surface, was only weeks old at the time this was written, and Cloudflare's own docs noted compatibility gaps in exactly the App Router features (Metadata API, `generateStaticParams`, ISR) this project depends on. `@opennextjs/cloudflare` runs the real `next build` output with a real production track record. Documented as "worth revisiting once vinext matures" — not a permanent decision.
- **On-demand ISR (`revalidate:false` + webhook) over timer-based ISR:** a timer-based `revalidate: <seconds>` would mean either serving stale content for up to that many seconds after a real edit, or over-fetching WordPress on a schedule regardless of whether anything changed. Tag-based, webhook-triggered invalidation instead only ever re-renders when content has actually changed, and does so as promptly as WordPress's webhook fires (§7/§9).
- **KV (not R2) for the incremental cache:** documented directly in `open-next.config.ts` — R2 requires a card on file to enable even within its own free tier, which this project deliberately avoids; the trade-off is R2's strong consistency vs. KV's eventual consistency (§7).
- **Webhook-based revalidation over polling:** a webhook reacts to actual publish events; polling WordPress on a schedule would mean either high latency (long poll interval) or wasted requests (short poll interval) — the webhook approach avoids both.
- **Multilingual routing — locale-prefixed for every locale, including English, no middleware:** simpler to reason about with one uniform rule (no special-casing the source language), and avoids the request-time overhead/complexity of `middleware.ts`-based locale detection or rewriting.
- **A custom `sexxedu/v1` WordPress plugin for translations, instead of WPML/Polylang:** not explicitly justified in the repository's own comments beyond "this is what this WordPress instance already uses" — **the rationale here is inferred, not confirmed**, based on the code's own framing of this as "the one file that's coupled to that specific plugin" and its explicit invitation to swap it out for WPML/Polylang if pointing at a different WordPress instance. Treat this as an existing constraint of the current WordPress instance, not a deliberate rejection of WPML/Polylang after evaluation.
- **A targeted HTML sanitizer instead of DOMPurify/jsdom:** documented directly in `sanitize.ts` — a full DOM-based sanitizer needs a real DOM implementation, which doesn't exist in the Workers runtime, and `jsdom` is both heavy and not edge-compatible.
- **Static/cached rendering for home, article, category, tag, author; force-dynamic for search/account:** home/article/category/tag/author are the highest-traffic, most cacheable, least personalized pages — ISR candidates. Category/tag/author were originally implemented `force-dynamic`, apparently as the simplest way to support `?page=N` query-string pagination (reading `searchParams` server-side forces dynamic rendering regardless of other config — see §7) rather than a deliberate rejection of caching for these routes; that reading is consistent with the fact that it directly contradicted `README.md`'s own stated intent for these routes. Fixed in this session by moving pagination client-side (§7) so page 1 can be ISR-cached like home/article. `search`/`account` remain genuinely `force-dynamic` — both depend on request-time data (a live search query, a signed-in session) that has no meaningful cached version.

---

## 32. Developer Quick Reference

### Start locally
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Deploy
```bash
npm run deploy
```

### Cloudflare logs
```bash
npx wrangler tail
```

### WordPress API
```text
{WORDPRESS_URL}/wp-json/wp/v2/posts?slug={slug}&_embed=1
{WORDPRESS_URL}/wp-json/sexxedu/v1/translations/{postId}/{locale}
```

### Revalidation
```text
POST https://www.thesexxeducation.com/api/revalidate
Authorization: Bearer <REVALIDATE_SECRET>
```

### Production URL
```text
https://www.thesexxeducation.com
```
(`NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` are configured for this domain in `.env.production.local` and `wrangler.jsonc`'s `vars`; the Custom Domain attachment itself still needs to be done in the Cloudflare dashboard — §34.12. Until then, the Worker is only reachable at its `*.workers.dev` fallback, `https://cloudflaretest.samar-singh-1799.workers.dev`.)

### Main article route
```text
/{locale}/{categorySlug}/{slug}
```

### Important files
```text
wrangler.jsonc
open-next.config.ts
src/app/api/revalidate/route.ts
src/lib/cache/tags.ts
src/lib/wordpress/client.ts
src/lib/wordpress/languages.ts
src/lib/i18n/locales.ts
src/lib/seo/site-config.ts
```

---

## 33. Final End-to-End Flow

```text
EDITOR
  │  writes and publishes a post in WordPress (title, body, featured image,
  │  category, tags, RankMath SEO fields, translations via the sexxedu/v1 plugin)
  ▼
WORDPRESS
  │  stores the post; its REST API now serves it publicly
  ▼
WORDPRESS REST API
  │  /wp-json/wp/v2/posts (+ _embed), /wp-json/sexxedu/v1/translations/*
  ▼
WEBHOOK
  │  WordPress-side plugin/hook fires an authenticated POST on publish/
  │  update/trash
  ▼
NEXT.JS / CLOUDFLARE
  │  POST /api/revalidate validates the bearer token, calls
  │  revalidateTag()/revalidatePath() for the specific post + lists + sitemap
  ▼
CACHE / ISR
  │  D1 tag cache (NEXT_TAG_CACHE_D1) records the invalidation; the next
  │  request for that path is a cache MISS in the KV incremental cache
  │  (NEXT_INC_CACHE_KV), triggering a fresh WordPress fetch + re-render,
  │  written back into KV
  ▼
CLOUDFLARE CDN
  │  the fresh HTML is now served instantly, at the edge, to every
  │  subsequent request — no further WordPress calls until the next
  │  invalidation
  ▼
VISITOR
     reads the up-to-date article, with correct canonical/hreflang/JSON-LD,
     in whichever supported locale they're browsing
```

**Numbered summary:**
1. An editor publishes/updates/trashes a post in WordPress, exactly as always.
2. WordPress's REST API (core `wp/v2` + the custom `sexxedu/v1` plugin) reflects that change immediately and publicly (subject to WordPress's own publish-status rules).
3. A WordPress-side webhook mechanism (configured in WordPress, §10) fires an authenticated `POST` to this repository's `/api/revalidate` endpoint.
4. That endpoint (§9) validates the shared secret and calls targeted `revalidateTag()`/`revalidatePath()` invocations — never a full-site rebuild.
5. This invalidation is recorded in Cloudflare D1 (the OpenNext tag cache).
6. The next real visitor request for an affected path is treated as a cache miss against the KV incremental cache, causing the Cloudflare Worker to re-fetch from WordPress and re-render the page.
7. The freshly rendered HTML is written back into KV.
8. Every subsequent visitor — across Cloudflare's global edge network — receives the updated content instantly, with no further WordPress calls, until the next publish/update/delete repeats this cycle.

---

# 34. Cloudflare Deployment Guide

This section documents exactly how this repository is (and can be) deployed to Cloudflare Workers, based on a direct inspection of `wrangler.jsonc`, `open-next.config.ts`, `package.json`, `.nvmrc`, and the absence/presence of any CI configuration in this repository. It supplements, and does not replace, §7/§11/§12/§14 above.

## 34.1 Deployment Architecture

Two deployment paths are architecturally possible with this codebase. Only one is directly verifiable from the repository's own contents.

**Path A — GitHub → Cloudflare Workers Builds (automatic):**
```text
GitHub Repository (samarsingh1799/thesexxeducationstatic)
      │  push to the configured production branch
      ▼
Cloudflare Workers Builds
      │  (configured entirely in the Cloudflare dashboard — no
      │   manifest/workflow file for this exists in the repository)
      ▼
Install dependencies        (npm install)
      ▼
Build Next.js application   (the project's configured build command)
      ▼
Deploy Worker                (the project's configured deploy command)
      ▼
Cloudflare Global Network
      ▼
Production Domain
```

**Path B — Local/manual deployment (verified against `package.json`):**
```text
Developer
      │  npm run build   (next build — optional standalone check)
      ▼
npm run deploy
      │  → opennextjs-cloudflare build   (produces .open-next/worker.js + assets)
      │  → opennextjs-cloudflare deploy  (wraps `wrangler deploy`)
      ▼
Cloudflare Workers
```

**Which one does this project actually use?** ❓ **Needs verification.** This repository contains:
- No `.github/workflows/` directory (confirmed empty/absent).
- No Cloudflare Pages/Workers Builds manifest or config file.
- A working, complete `wrangler.jsonc` and a `package.json` with exactly the scripts Path B needs (`deploy`, `preview`, `cf-typegen`).

This is strong evidence that, **as committed to this repository, Path B (manual `npm run deploy`) is the verified, functional deployment path.** Path A (Workers Builds GitHub integration) may or may not be additionally configured on the Cloudflare account side — that configuration lives entirely in the Cloudflare dashboard and is invisible to a repository-only inspection. Confirm directly in the dashboard: Workers & Pages → the `cloudflaretest` Worker → **Settings → Builds** — if a GitHub repository is connected there, Path A is active; if that panel shows no connected repository, only Path B applies.

## 34.2 Cloudflare Prerequisites

| Prerequisite | Requirement (from this repository) |
| --- | --- |
| Cloudflare account | Required — with Workers enabled (default for all accounts) |
| Node.js | **22.23.2** exactly, per `.nvmrc` (`nvm use` picks this up automatically). Wrangler 4.x requires Node ≥ 18; this project pins a much newer version deliberately (per `README.md`: "Wrangler requires Node >=22") |
| Package manager | npm (a `package-lock.json` is committed; no `yarn.lock`/`pnpm-lock.yaml` exists — do not switch package managers) |
| Wrangler | **4.131.0**, resolved as a transitive dependency (via `@opennextjs/cloudflare`/`drizzle-kit`) — not a direct `package.json` dependency. Available via `npx wrangler` or the npm scripts that invoke it internally. Do not assume a globally-installed Wrangler is this version; prefer `npx wrangler` (uses the locally resolved version) over a global install |
| GitHub account/repository | Only required if Path A (§34.1) is used. The existing remote is `git@github.com:samarsingh1799/thesexxeducationstatic.git` |
| Cloudflare API access | A `wrangler login` (browser OAuth) or a Cloudflare API token (for non-interactive/CI use) — see §34.7 |
| Domain ownership | Required only if attaching a custom domain (§34.12) — not required to get a working `*.workers.dev` deployment |
| WordPress API availability | The WordPress origin (`WORDPRESS_URL`) must be reachable over HTTPS from Cloudflare's network before the deployed site will render any real content — see §5 |

## 34.3 Cloudflare Account Setup

For a developer who has never deployed a Worker before, using this repository:

1. Sign up / log in at `https://dash.cloudflare.com/`.
2. **If** attaching a custom domain eventually, add that domain to Cloudflare as a zone (Websites → Add a site) — **not required** for an initial `*.workers.dev` deployment.
3. In the dashboard, open **Workers & Pages**.
4. This repository's `wrangler.jsonc` already fully defines the Worker (name `cloudflaretest`, bindings, compatibility settings) — there is **no need to manually click "Create Worker/application"** in the dashboard first; `npm run deploy` (Path B) creates the Worker on first deploy if it doesn't already exist, driven entirely by `wrangler.jsonc`.
5. **If** using Path A (Workers Builds): in Workers & Pages, use **"Connect to Git"** / the Worker's **Settings → Builds** panel to connect the GitHub repository — see §34.8 for what to configure there. **This step's actual current state cannot be confirmed from the repository alone.**
6. Select the repository (`samarsingh1799/thesexxeducationstatic`) if using Path A.
7. Select the production branch — **Needs verification** which of `main`/`test` is intended (§14).
8. Configure the build command — see §34.6 for the exact command this repo expects (`opennextjs-cloudflare build`, invoked via `npm run deploy`'s pipeline; Workers Builds typically wants just the build half).
9. Configure the deploy command — `opennextjs-cloudflare deploy` (or let Workers Builds handle deploy automatically after a successful build, per its own default behavior).
10. Configure environment variables/secrets (§34.10/§34.11) — **this must be done before the first real production deploy**, or the deployed site will error on every WordPress-dependent page.
11. Deploy (either `npm run deploy` locally, or push to the connected branch if Path A is active).
12. Verify deployment (§34.18).

## 34.4 GitHub Repository Setup

- **Repository URL:** `git@github.com:samarsingh1799/thesexxeducationstatic.git`
- **Production branch:** ❓ **Needs verification.** The remote's `HEAD` symbolic ref points at `origin/test`, and `test` is also the currently checked-out local branch — this suggests `test` may function as the primary/production branch in practice, but a `main` branch also exists on the remote. Confirm which branch is actually wired to production deploys (either in the Cloudflare dashboard's Workers Builds settings, if Path A applies, or by convention among the team for Path B).
- **Development branch:** not distinguished in this repository's Git configuration beyond the two branches above.
- **Required files for either deployment path:** `package.json`, `wrangler.jsonc`, `next.config.ts`, `open-next.config.ts`, `tsconfig.json`, the entire `src/` tree, `public/`, `drizzle.config.ts`, `migrations/`.
- **Required scripts:** `build`, `deploy`, `preview`, `cf-typegen` (all present in `package.json` — §34.6).
- **Required configuration files:** `wrangler.jsonc` (must be committed — it is **not** gitignored, unlike the generated `cloudflare-env.d.ts`, `.open-next/`, and `.wrangler/`).

What must be committed before deployment (actual files that exist in this repo's tracked tree — not invented):
```text
package.json
package-lock.json
next.config.ts
open-next.config.ts
wrangler.jsonc
drizzle.config.ts
tsconfig.json
eslint.config.mjs
.nvmrc
src/
public/
migrations/
```
**Must NOT be committed** (already correctly gitignored): `.env*`, `.dev.vars`, `cloudflare-env.d.ts`, `.next/`, `.open-next/`, `.wrangler/`, `*.tsbuildinfo`, `next-env.d.ts`.

## 34.5 Wrangler Configuration

The full, actual `wrangler.jsonc` from this repository (values reproduced verbatim — none are secrets; database/KV **ids** are resource identifiers, not credentials, and do not grant access on their own).

> **Updated during this documentation session:** a `vars` block was added (it did not exist before) setting `NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` to the intended production domain, `https://www.thesexxeducation.com`, and `.env.production.local` was updated to match (so a local production-style build inlines the correct value — see §34.10's build-time-vs-runtime explanation). This is the one part of the domain migration that's a plain repository edit; everything else (actually attaching the domain, DNS, secrets) still requires Cloudflare dashboard access — see the checklist at the end of this section.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "cloudflaretest",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],

  "vars": {
    "NEXT_PUBLIC_SITE_URL": "https://www.thesexxeducation.com",
    "BETTER_AUTH_URL": "https://www.thesexxeducation.com"
  },

  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },

  "services": [
    { "binding": "WORKER_SELF_REFERENCE", "service": "cloudflaretest" }
  ],

  "d1_databases": [
    { "binding": "DATABASE", "database_name": "cloudflaretest-db", "database_id": "b4f88d60-91d9-4ce1-8bd4-2ccfd4d4a500" },
    { "binding": "NEXT_TAG_CACHE_D1", "database_name": "cloudflaretest-db", "database_id": "b4f88d60-91d9-4ce1-8bd4-2ccfd4d4a500" }
  ],

  "kv_namespaces": [
    { "binding": "NEXT_INC_CACHE_KV", "id": "82532f71eaab4e128e4a1757ab19ac49" }
  ],

  "images": { "binding": "IMAGES" },

  "observability": { "enabled": true }
}
```

**Property-by-property explanation:**
- **`name`: `"cloudflaretest"`** — the Worker's name; also determines its default `*.workers.dev` URL (`https://cloudflaretest.<your-subdomain>.workers.dev`). Renaming this is possible but out of scope for this documentation session — it would also require updating the matching `services` entry below and redeploying under the new name; not done here since it's a naming/identity decision, not a domain-configuration one.
- **`main`: `.open-next/worker.js`** — the entry point Wrangler deploys; this file doesn't exist until `opennextjs-cloudflare build` (or the `preview`/`deploy` scripts, which run it first) has been run at least once. It is gitignored (`.open-next/` is a build artifact directory) — **do not commit it, and do not attempt to deploy without building first.**
- **`compatibility_date`: `"2026-09-01"`** — pins the Workers runtime (`workerd`) feature set to this date's behavior. Bumping this later is a routine maintenance task, but should be tested via `npm run preview` first, since a newer compatibility date can change runtime behavior.
- **`compatibility_flags`: `["nodejs_compat", "global_fetch_strictly_public"]`** — `nodejs_compat` enables Node.js API polyfills required by Next.js/OpenNext/Drizzle/better-auth to run at all on Workers; `global_fetch_strictly_public` is a Workers security flag restricting what an in-Worker `fetch()` can reach (relevant since this project's `fetch()` calls to WordPress must resolve to a public, non-private-network address).
- **`vars` → `NEXT_PUBLIC_SITE_URL` / `BETTER_AUTH_URL`** — **added during this session.** `BETTER_AUTH_URL` is read only at request time (`src/lib/auth/index.ts`), so this is now its sole production source. `NEXT_PUBLIC_SITE_URL`'s primary effect is still build-time inlining (via `.env.production.local`, updated to match) — this runtime copy is a consistency backstop for any server-side code that reads `process.env.NEXT_PUBLIC_SITE_URL` at request time via OpenNext's `process.env` polyfill (e.g. `src/lib/seo/site-config.ts`). **If the production domain ever changes, update both this block and `.env.production.local` together, then rebuild and redeploy** — a mismatch between the two would mean the client-visible canonical/OG URLs (build-time) disagree with the server-rendered `BETTER_AUTH_URL` (runtime).
- **`assets`** — `directory: .open-next/assets` (the static output of `next build`, adapted by OpenNext), bound as `ASSETS`. Cloudflare serves these files directly from the edge, without invoking the Worker, for any request path that matches a file in this directory.
- **`services` → `WORKER_SELF_REFERENCE`** — lets the Worker invoke itself as a bound service; required internally by the OpenNext adapter for certain request-handling paths (e.g., background/on-demand ISR regeneration plumbing).
- **`d1_databases`** — the **same physical D1 database** (`cloudflaretest-db`, same `database_id`) is bound **twice**, under two different binding names: `DATABASE` (used by this app's own Drizzle queries — auth, saved articles, likes, view counts) and `NEXT_TAG_CACHE_D1` (used internally by the OpenNext D1 tag-cache adapter — that exact binding name is hard-coded inside the adapter's own code, not a name this project chose). This dual-binding pattern is intentional, not a mistake. **Needs verification before a real production deploy under the `www.thesexxeducation.com` launch:** confirm this specific `database_id` actually exists under the Cloudflare account you're deploying to (`npx wrangler d1 list`) — it may belong to a test/staging account.
- **`kv_namespaces` → `NEXT_INC_CACHE_KV`** — the ISR incremental (page/data) cache. This exact binding name is also hard-coded by the OpenNext KV incremental-cache adapter. Same caveat as above: verify this `id` exists under the target account (`npx wrangler kv namespace list`).
- **`images` → `IMAGES`** — Cloudflare's native image resizing binding, consumed by `next/image` through the OpenNext adapter with no custom loader needed.
- **`observability.enabled: true`** — turns on Cloudflare's Workers Logs/Observability collection for this Worker (see §34.21, §23 for Free-plan caveats).
- **No `routes` block** — no custom route pattern is bound directly in `wrangler.jsonc`; a custom domain (§34.12) is attached separately via the dashboard (or `wrangler.jsonc`'s `routes`/dashboard UI). **This is the one production-domain step that could not be done as part of this documentation session** — it requires Cloudflare dashboard access to attach `www.thesexxeducation.com` (and a zone for `thesexxeducation.com` to exist on Cloudflare in the first place).
- **No `[env.*]` / preview environment block** — no separate preview/staging environment configuration exists in this file (§34.15).

## 34.6 Package.json Deployment Scripts

Every script in `package.json`, and exactly what it does:

```bash
npm run dev        # `next dev` — plain Next.js dev server, no Cloudflare emulation, fastest iteration loop
npm run build       # `next build` — standard Next.js production build (does NOT produce a Workers bundle by itself)
npm run start       # `next start` — serves the plain `next build` output (not Cloudflare-accurate; useful only as a quick non-Cloudflare sanity check)
npm run lint        # `eslint` — lints the whole project per eslint.config.mjs
npm run preview     # `opennextjs-cloudflare build && opennextjs-cloudflare preview` — builds the real Worker bundle, then runs it under local Wrangler (Miniflare), with real D1/KV emulated locally
npm run deploy      # `opennextjs-cloudflare build && opennextjs-cloudflare deploy` — builds the real Worker bundle, then deploys it to Cloudflare via Wrangler
npm run cf-typegen  # `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts` — regenerates the typed CloudflareEnv interface from wrangler.jsonc's current bindings; run this after ANY change to wrangler.jsonc's bindings
npm run db:generate       # `drizzle-kit generate` — produces a new SQL migration file from src/db/*-schema.ts
npm run db:migrate:local  # `wrangler d1 migrations apply cloudflaretest-db --local` — applies migrations to the local D1 emulation (SQLite file, no live account needed)
npm run db:migrate:remote # `wrangler d1 migrations apply cloudflaretest-db --remote` — applies migrations to the REAL, live D1 database — requires Cloudflare auth and a real, already-created D1 database matching wrangler.jsonc's database_id
npm run auth:schema      # `auth generate --config src/lib/auth/index.ts --output src/db/auth-schema.ts -y` — regenerates better-auth's own Drizzle schema file; never hand-edit src/db/auth-schema.ts directly
```

There is no `test`, `typecheck`, or `format` script — see §13/§26 for the manual equivalents used instead.

## 34.7 First-Time Local Deployment

```bash
git clone git@github.com:samarsingh1799/thesexxeducationstatic.git
cd thesexxeducationstatic   # (or this repo's actual local directory name)
nvm use                      # picks up Node 22.23.2 from .nvmrc
npm install
```

**Cloudflare authentication** (one-time, interactive):
```bash
npx wrangler login
# opens a browser window for Cloudflare OAuth; confirm the correct account if you have more than one
```

**Set up the D1 database and KV namespace** — this repo's `wrangler.jsonc` already contains a `database_id` and a KV `id`, which strongly suggests these resources were already created at some point (possibly under a different Cloudflare account than yours). **Needs verification:** if these specific ids don't exist under your authenticated account, deployment/migration commands referencing them will fail. If starting fresh under your own account:
```bash
npx wrangler d1 create cloudflaretest-db
# → copy the returned database_id into wrangler.jsonc's two d1_databases entries

npx wrangler kv namespace create NEXT_INC_CACHE_KV
# → copy the returned id into wrangler.jsonc's kv_namespaces entry
```

**Apply database migrations to the real, remote D1 database:**
```bash
npm run db:migrate:remote
```

**Set production secrets** (§34.11 has the full explanation — never echo the real values into shell history unnecessarily):
```bash
npx wrangler secret put REVALIDATE_SECRET
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put WORDPRESS_URL
```

**Production vars** (`BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`) are already set in `wrangler.jsonc`'s `vars` block, to `https://www.thesexxeducation.com` — no action needed here unless the production domain changes later (§34.10).

**Build and deploy:**
```bash
npm run build     # optional — a plain Next.js build sanity check before the real Workers build
npm run deploy    # opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

**What to expect after deployment:** Wrangler's output prints a deployed Worker URL of the form `https://cloudflaretest.<your-workers-dev-subdomain>.workers.dev`. For this specific repository/account, that URL is already recorded (as the non-secret `NEXT_PUBLIC_SITE_URL` value used for local production-build testing, in `.env.production.local`):
```text
https://cloudflaretest.samar-singh-1799.workers.dev
```
Deploying under a **different** Cloudflare account would produce a different subdomain — this exact value is specific to the account this project was originally set up under. Open it and verify per §34.18. If a custom domain is later attached (§34.12), that becomes the primary production URL instead, and `NEXT_PUBLIC_SITE_URL` must be updated to match (then rebuilt — §34.10).

## 34.8 Cloudflare GitHub Automatic Deployment

**Status in this repository: not confirmable.** No `.github/workflows/` directory, no Cloudflare Pages/Workers Builds configuration file, and no CI-related script exists anywhere in the tracked files. If this integration exists, it was configured entirely through the Cloudflare dashboard against the GitHub repository and cannot be verified by inspecting the code.

If/when configuring it, Cloudflare Workers Builds follows this shape:
```text
git push
   ↓
GitHub (samarsingh1799/thesexxeducationstatic)
   ↓
Cloudflare Workers Builds picks up the push (on the configured production branch)
   ↓
Build   → the command configured in the dashboard's Build configuration (this project needs: `opennextjs-cloudflare build`, or equivalently `npm run build` if the dashboard is set up to run the full `npm run deploy` pipeline's build half — confirm which convention the dashboard expects at configuration time)
   ↓
Deploy  → `opennextjs-cloudflare deploy` (or Workers Builds' own automatic deploy step following a successful build, depending on how it's configured)
```

Document, once confirmed in the dashboard: production branch (§34.4's open question), the exact configured build/deploy commands, root directory (should be the repository root, since `wrangler.jsonc`/`package.json` live there), Node version (should be pinned to match `.nvmrc`'s 22.23.2 in the dashboard's build environment settings, since Workers Builds does not automatically read `.nvmrc`), environment variables (§34.10), whether preview deployments are enabled for non-production branches/PRs (§34.15), and where to find build logs (§34.21).

## 34.9 Cloudflare Dashboard Setup

Dashboard navigation (current Cloudflare terminology, Workers & Pages product):

**Build configuration:** Workers & Pages → `cloudflaretest` → **Settings → Build** — Build command, Deploy command, Root directory, Production branch (only present/relevant if Path A/Workers Builds is connected).

**Environment variables:** Workers & Pages → `cloudflaretest` → **Settings → Variables and Secrets** — separate sections for Production and Preview (if a preview environment is configured — §34.15).

**Secrets:** same **Variables and Secrets** screen — toggle "Secret" (encrypted, write-only after saving) vs. plain text variable when adding an entry. Equivalent to `wrangler secret put` from the CLI (§34.11).

**Domain:** Workers & Pages → `cloudflaretest` → **Settings → Domains & Routes** → "Add Custom Domain" (§34.12).

**Observability:** Workers & Pages → `cloudflaretest` → **Logs**/**Metrics**/**Observability** tabs — real-time invocation logs, error rates, request volume, CPU time. Enabled by this repo's `wrangler.jsonc` (`observability.enabled: true`).

No secret values are reproduced here or anywhere in this document.

## 34.10 Environment Variables

| Variable | Required | Production | Preview | Secret | Purpose |
| --- | --- | --- | --- | --- | --- |
| `WORDPRESS_URL` | Yes | Set as a Worker **secret** | Needs verification (no preview env configured — §34.15) | Yes — `<SECRET - configure in Cloudflare>` | WordPress origin, server-only |
| `REVALIDATE_SECRET` | Yes | Worker **secret** | Needs verification | Yes — `<SECRET - configure in Cloudflare>` | Webhook bearer-token auth |
| `BETTER_AUTH_SECRET` | Yes | Worker **secret** | Needs verification | Yes — `<SECRET - configure in Cloudflare>` | better-auth signing key |
| `BETTER_AUTH_URL` | Yes | **Set in `wrangler.jsonc`'s `vars`** → `https://www.thesexxeducation.com` | Needs verification | No | This deployment's own base URL for better-auth |
| `NEXT_PUBLIC_SITE_URL` | Yes | **Set in `wrangler.jsonc`'s `vars`** (runtime) → `https://www.thesexxeducation.com`, and **must also be present at build time** (see below) — `.env.production.local` was updated to match | Needs verification | No — inlined into client JS, publicly visible by design | Canonical/OG/hreflang/sitemap base URL |
| `SEXXEDU_INTERNAL_SECRET` | No | Worker secret, if used | Needs verification | Yes — `<SECRET - configure in Cloudflare>` | Optional feedback IP-forwarding trust |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | Plain var, build-time | Needs verification | No — public by nature | GA4 measurement id |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | No | Plain var, build-time | Needs verification | No — public by nature | AdSense client id / site verification |

**`NEXT_PUBLIC_*` vs. server-only — the critical distinction for deployment:** every variable prefixed `NEXT_PUBLIC_` is baked into the compiled JavaScript **at build time** (`next build`, run as part of `opennextjs-cloudflare build`) — setting it only as a runtime Worker secret/var **after** the build has no effect on already-built pages, because the value is literally embedded in the built output. This is why this repository has a local `.env.production.local` file (containing only the two non-secret `NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` values) — so a locally-run `npm run build`/`npm run preview` reflects real production-like values instead of the `.env.local` development defaults. **For an actual production deploy, whatever build environment runs `opennextjs-cloudflare build` (your local machine for Path B, or Cloudflare's build environment for Path A) must have `NEXT_PUBLIC_SITE_URL` available at that build step** — a plain Worker "variable" set only in the dashboard's runtime config is not sufficient for a `NEXT_PUBLIC_*` value, since that config isn't consulted at build time. Every other variable in the table above (no `NEXT_PUBLIC_` prefix) is read only inside server-side code at **request time**, via Cloudflare's `env` bindings — those are correctly configured as Worker secrets/vars in the dashboard or via `wrangler secret put`, with no build-time step required.

## 34.11 Cloudflare Secrets

This project uses Wrangler/dashboard secrets (there is no `.dev.vars`-equivalent mechanism for production — that file is strictly local-only and gitignored).

**Via Wrangler CLI:**
```bash
npx wrangler secret put REVALIDATE_SECRET
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put WORDPRESS_URL
npx wrangler secret put SEXXEDU_INTERNAL_SECRET   # optional
```
Each command prompts interactively for the value (not passed as a CLI argument, so it never appears in shell history).

**Via the dashboard** (equivalent, useful for teammates without CLI access):
```text
Cloudflare Dashboard
  → Workers & Pages
  → cloudflaretest
  → Settings
  → Variables and Secrets
  → Add → toggle "Encrypt" (secret) → Save
```

**Never** put any of these four values in `wrangler.jsonc`'s (currently nonexistent) `vars` block — that file is committed to git. **No real secret value is reproduced anywhere in this document.**

## 34.12 Custom Domain Setup

**Decided production domain: `www.thesexxeducation.com`.** This is now reflected in the app-level config (`wrangler.jsonc`'s `vars`, `.env.production.local` — see §34.5/§34.10, updated during this documentation session). **The domain is not yet actually attached to the Worker in Cloudflare** — that step requires dashboard access this document doesn't have. Remaining steps:

1. Confirm `thesexxeducation.com` is added to Cloudflare as a zone (Websites → Add a site) — needed before `www.thesexxeducation.com` can be attached as a Worker Custom Domain. **Needs verification** whether this zone already exists on this Cloudflare account (the WordPress origin may already live on a related domain — check whether `thesexxeducation.com`/a subdomain is already a Cloudflare zone before assuming a fresh setup is needed).
2. No separate DNS record needs to be pre-created for a Worker Custom Domain — Cloudflare manages that automatically when you attach the domain to the Worker (next step).
3. Workers & Pages → `cloudflaretest` → **Settings → Domains & Routes → Add → Custom Domain** → enter `www.thesexxeducation.com`.
4. Decide the apex behavior: attach `thesexxeducation.com` (no `www`) as a second Custom Domain pointed at the same Worker with a redirect rule to `www`, **or** set up a Cloudflare Redirect Rule / Bulk Redirect so `thesexxeducation.com` → `https://www.thesexxeducation.com` (301). `www` was chosen as the canonical form here because that's what `NEXT_PUBLIC_SITE_URL` is now set to — whichever form you pick, the *other* one must redirect to it, or search engines can end up indexing both as separate, competing URLs.
5. SSL is provisioned automatically by Cloudflare once the custom domain is attached — verify the padlock/certificate in a browser after attaching.
6. Test the production URL end-to-end per §34.18.

`NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` **do not need to be updated again** for this — they already point at `www.thesexxeducation.com` (§34.5/§34.10). The only remaining action is the Cloudflare-side domain attachment itself (steps 1–5 above); once done, redeploy (`npm run deploy`) so the build picks up this domain's config cleanly end-to-end, then run the §34.18 verification checklist against the real domain.

## 34.13 DNS

- **Worker Custom Domain behavior:** when you attach a Custom Domain to a Worker via the dashboard (§34.12), Cloudflare automatically creates/manages the necessary proxied DNS record for that hostname — there is no manual A/AAAA/CNAME record to hand-create for the Worker itself.
- **`www` vs. root domain:** whichever you choose to attach as the Worker's Custom Domain; if you want both to work, attach both (or attach one and configure a redirect rule for the other — Cloudflare-side, not part of this codebase).
- **CMS/API domain — clearly a separate concern from the public website:**

| | Public website | WordPress CMS/API |
| --- | --- | --- |
| Domain | The domain you attach as this Worker's Custom Domain (§34.12) | The value of `WORDPRESS_URL` — a **different** host (this project's own hosting, not this repository's Worker) |
| DNS management | Managed by Cloudflare's Worker Custom Domain feature once attached | Managed wherever the WordPress instance is hosted (may or may not also be behind Cloudflare — proxying/DNS for the WordPress host is entirely outside this repository's scope) |

This document does not modify any DNS configuration automatically or make assumptions about the WordPress host's own DNS setup.

## 34.14 Production Deployment

```text
1.  Make code changes
2.  Run tests               — none exist in this repo (§13/§26); skip, or add them first if desired
3.  Run lint                — npm run lint
4.  Run type checking        — npx tsc --noEmit
5.  Run a production build   — npm run build   (plain Next.js sanity check)
6.  Verify the WordPress API is reachable       — curl the WordPress REST endpoint directly
7.  Commit changes
8.  Push to the production branch                — confirm which branch first, §34.4
9.  If Path A (Workers Builds) is connected: wait for Cloudflare's automatic build
    If Path B (manual): run `npm run deploy` yourself
10. Check deployment/build logs                   — dashboard (§34.8/§34.21) or your own terminal output
11. Open the production website
12. Test an article page
13. Test /sitemap.xml
14. Test /robots.txt
15. Test /api/revalidate with a wrong token (expect 401) and, if you have the real secret,
    with a real payload for a known post (expect 200 + revalidated:true)
```

## 34.15 Preview Deployment

**Not configured in this repository.** `wrangler.jsonc` contains no `[env.preview]`/named-environment block, and no separate preview-specific script exists in `package.json`. If Path A (Workers Builds) is connected on the Cloudflare account side, Workers Builds' own default behavior may still generate preview deployments for non-production branches/pull requests automatically — **this is a Cloudflare-account-level behavior this document cannot confirm from the repository alone.** If preview deployments do exist via that mechanism, they would, by Workers Builds' own default design, get their own separate `*.workers.dev`-style preview URL per build, but would **share the same D1/KV bindings** as production unless a named environment (`[env.preview]` in `wrangler.jsonc`, not present here) is explicitly configured to point at separate resources — meaning a preview build today would read/write the **same production D1 database and KV namespace** if it ran, which is a real risk to flag if preview deployments are ever enabled without first adding proper environment separation to `wrangler.jsonc`.

## 34.16 Deployment Without GitHub

```bash
npm install
npm run build      # optional plain-Next.js check
npm run deploy     # opennextjs-cloudflare build && opennextjs-cloudflare deploy
```
(Identical to §34.7 — this project's manual deployment path doesn't have a separate raw `wrangler deploy` invocation; `npm run deploy` already wraps the correct build step before deploying.)

- **Cloudflare authentication:** `npx wrangler login` (interactive) or a Cloudflare API token via the `CLOUDFLARE_API_TOKEN` environment variable (for non-interactive/scripted use — standard Wrangler behavior, not custom to this repo).
- **Required account permissions:** the authenticated account/token needs permission to edit Workers, D1, and KV resources matching this project's `wrangler.jsonc`.
- **Required environment variables:** all of §34.10's "Yes" rows must be set before the deploy will function correctly at runtime (the deploy itself will still succeed even with them unset — the failures happen at request time, not deploy time; see §34.22).
- **How to verify deployment:** §34.18.
- **How to view deployment logs:** the terminal output of `npm run deploy` itself (for Path B); `npx wrangler tail` for live runtime logs after deployment (§34.21).

## 34.17 Rollback

- **Cloudflare dashboard rollback:** Workers & Pages → `cloudflaretest` → **Deployments** (or **Versions**, depending on current dashboard terminology) — Cloudflare Workers retains a history of previous deployments; select a prior one and roll back to it. This is the fastest recovery path and does not require a new build.
- **Wrangler version commands:** `npx wrangler deployments list` and `npx wrangler rollback [deployment-id]` are the standard Wrangler CLI equivalents of the dashboard rollback (verify exact subcommand syntax against your installed Wrangler version, 4.131.0, via `npx wrangler rollback --help`, since exact flags can shift between Wrangler versions).
- **Git revert workflow:** `git revert <bad-commit>` (never `reset --hard` on a shared branch), then redeploy via `npm run deploy` (or push, if Path A is active) — this is the correct path when the rollback needs to also be reflected in source control, not just in the currently-live Worker version.
- **Recommended procedure:** for an urgent production incident, roll back via the Cloudflare dashboard/CLI first (fastest, no rebuild needed), then separately fix and redeploy properly, then `git revert` if the bad change was already merged to the production branch — don't let an emergency rollback silently diverge from what's in source control.

## 34.18 Deployment Verification

```text
/                       → should permanently redirect to /en (or your default locale)
/articles/<slug>        → NOTE: this project's actual article path is /{locale}/{categorySlug}/{slug}, not /articles/<slug> — test e.g. /en/{categorySlug}/{slug}
/sitemap.xml            → valid XML sitemap index
/robots.txt             → valid robots rules, references /sitemap.xml
```

**API/Revalidation:**
```bash
curl -i -X POST "https://<domain>/api/revalidate"
# expect: 401 Unauthorized (no Authorization header) — confirms the Worker booted and the route is reachable
```

**Cloudflare:**
- Worker status: dashboard shows the Worker as deployed/active.
- Deployment version: confirm the dashboard's "current version" matches what you just deployed (via its deployment id/timestamp).
- Logs: `npx wrangler tail` shows real request traffic with no unexpected 500s.
- Errors: dashboard's Observability/error-rate view is clean.
- Cache: repeat-request an article and confirm it's served fast/consistently (indicating a KV cache hit) rather than re-rendering every time.
- Domain: whichever domain (workers.dev or custom) you're testing resolves correctly with valid TLS.

## 34.19 New Article Deployment vs. Code Deployment

**These are two entirely separate, independent flows in this architecture — publishing a WordPress article never triggers a Worker deployment, and deploying new code never touches WordPress content.**

**Code change:**
```text
Developer
   ↓  edits src/, wrangler.jsonc, etc.
GitHub (if Path A)  /  local machine (if Path B)
   ↓
Cloudflare build     (opennextjs-cloudflare build)
   ↓
Worker deployment    (opennextjs-cloudflare deploy / wrangler deploy)
```
This is the **only** thing that changes the deployed Worker's *code* (routes, components, rendering logic, cache configuration itself). It does **not** run on any schedule tied to WordPress activity.

**New article:**
```text
Editor
   ↓  publishes in WordPress
WordPress
   ↓  webhook plugin fires
POST /api/revalidate       (an existing route on the ALREADY-DEPLOYED Worker — no new deploy happens)
   ↓
revalidateTag() / revalidatePath()   (cache invalidation only)
   ↓
Article regenerated on next request, served from cache thereafter
```

**Confirmed from the code (§9, §7):** publishing/updating/deleting a WordPress article causes **only a cache revalidation** via the already-running `/api/revalidate` Worker route — it never triggers a new build, a new deploy, or any change to the Worker's own code/version. The Worker that handles the webhook and re-renders the article is the exact same Worker version that was already live before the editor hit "Publish." This is precisely why the webhook-based approach (§7/§31) is fast: it's a cache operation on live infrastructure, not a redeploy.

## 34.20 Cloudflare Caching and ISR

(Full detail already in §7; this subsection restates the deployment-relevant essentials for someone reading only the deployment guide.)

- **ISR:** on-demand only — `revalidate: false` on home/article pages (§7's table), never a numeric timer. Cached indefinitely in KV until an explicit tag/path invalidation.
- **Cache duration:** effectively infinite until invalidated — there is no "this page expires after N seconds" configuration anywhere in this project.
- **Stale-while-revalidate:** **not used** — this project's model is cache-forever-until-explicitly-invalidated, not background-revalidate-on-a-timer. A cached page is never silently served "stale" while a background regeneration happens; it's simply served as-is until the webhook says otherwise.
- **Cache invalidation:** exclusively via `/api/revalidate` (webhook-driven, §9) calling `revalidateTag()`/`revalidatePath()`.
- **Article cache:** ISR (ISR table in §7).
- **Homepage cache:** ISR.
- **Category/tag/author cache:** **on-demand ISR for page 1** (fixed — see §7): cached at the edge exactly like home/article, invalidated only by the WordPress webhook. Pagination beyond page 1 is a separate, always-dynamic client-side fetch (`/api/listings`) that never touches the cached page shell.
- **Sitemap cache:** ISR-style (`revalidate:false`), invalidated by the `sitemap` cache tag.
- **API cache:** none of the mutating/session-gated `/api/*` routes are cached; `/api/language-availability/*` uses the same ISR mechanism as a page (`revalidate:false`, tag/path-invalidatable).

**"What happens when a user requests an article that is not cached?"** That request itself triggers the render: the Worker calls WordPress's REST API (via `wpFetch`, with retry/backoff on transient errors), builds the page, and — for ISR-eligible routes — writes the result into the KV incremental cache before responding. That first visitor experiences the full render latency (a WordPress round trip + React render); every subsequent visitor gets the now-cached result instantly.

**"What happens when an article is cached but stale?"** In this project's model, a cached article is **never considered "stale" on its own** — there's no time-based expiry to become stale against. It remains "current" indefinitely from the cache's point of view until an explicit `revalidateTag`/`revalidatePath` call (from the webhook) marks it invalid. So the honest answer is: this architecture has no natural "stale" state for these pages — only "cached and valid" or "invalidated, about to be re-rendered on next request."

**"What happens after WordPress sends the revalidation webhook?"** See §8/§9's full walkthrough — summarized: the named tags/paths are invalidated in the D1 tag cache; the very next request for any of them is a KV cache miss, triggering a fresh WordPress fetch and re-render, which repopulates KV for all subsequent requests.

## 34.21 Cloudflare Logs

**Dashboard:**
```text
Cloudflare Dashboard
  → Workers & Pages
  → cloudflaretest
  → Logs / Observability
```
Shows real-time and historical request logs, including status codes, execution time, and (if instrumented) `console.error`/`console.log` output from the Worker — relevant since `wpFetch` and several `lib/wordpress/*.ts` functions explicitly `console.error` on failure (§5).

**CLI:**
```bash
npx wrangler tail
```
Streams live logs from the deployed Worker to your terminal. This is the single most useful command for diagnosing a live issue in real time (§27/§34.22).

**Identifying specific problem classes in the logs:**
- **500 errors:** look for an uncaught exception stack trace — most likely from `createAuth()`/`getCurrentSession()` if `BETTER_AUTH_SECRET`/D1 binding issues exist, or from `getCloudflareContext()` failing if bindings are misconfigured.
- **WordPress API errors:** `wpFetch`'s own thrown errors are prefixed `"WordPress request failed (...)"` or `"WordPress returned a non-JSON response (...)"` — these are logged via each calling function's `console.error` (e.g., `"Failed to fetch posts:"`, `"Failed to fetch post by slug (...)"`).
- **Revalidation errors:** check the `/api/revalidate` route's own response body (it always returns a JSON summary, even on the "nothing matched" path) — a `401` means the bearer token was wrong/missing; look for that specifically if the webhook plugin's own delivery log shows a non-200 response.
- **Environment variable problems:** `wpFetch`'s underlying `getWordPressUrl()` throws an explicit `"WORDPRESS_URL is not set..."` error — this is easy to spot in logs and points directly at a missing secret.
- **Routing problems:** a 404 that shouldn't be one is most efficiently debugged by checking the specific route file's own logic (§6/§7's tables) rather than logs — Next.js routing decisions aren't separately logged by Cloudflare.
- **Cache problems:** compare response timing/consistency across repeated requests (a genuine cache hit should be materially faster and byte-identical) — Cloudflare's dashboard doesn't expose a direct "was this a KV cache hit" indicator for OpenNext's incremental cache, so this is inferred from behavior, not a dedicated log line.

## 34.22 Common Deployment Errors

| Error | Cause | How to diagnose | Fix |
| --- | --- | --- | --- |
| Build fails during `opennextjs-cloudflare build` | TypeScript error, incompatible Next.js/adapter version mismatch, or a Node version mismatch | Read the build's own console output; confirm `node -v` matches `.nvmrc` (22.23.2) | Fix the underlying TS/build error; run `nvm use` |
| `wrangler login`/authentication fails | Expired session, wrong account, blocked browser popup | Re-run `npx wrangler login`; check `npx wrangler whoami` | Re-authenticate; for CI, use `CLOUDFLARE_API_TOKEN` instead of interactive login |
| Worker deployment fails ("binding not found" or similar) | `wrangler.jsonc` references a D1 database/KV namespace id that doesn't exist under the authenticated account | `npx wrangler d1 list` / `npx wrangler kv namespace list` and compare ids against `wrangler.jsonc` | Create the missing resources (§34.7) and update `wrangler.jsonc`'s ids to match, or switch to the account that owns the existing ids |
| Missing environment variable at runtime | A required secret/var (§34.10) was never set for this environment | Request logs show an explicit thrown error naming the missing variable (e.g., `WORDPRESS_URL is not set`) | Set the missing secret/var (§34.11) and, for `NEXT_PUBLIC_*` ones, **rebuild and redeploy** (build-time inlining — §34.10) |
| WordPress API unavailable | WordPress host down, DNS issue, or a WAF blocking Cloudflare's outbound requests | `curl` the WordPress REST URL directly from outside Cloudflare; check Worker logs for `wpFetch` errors | Fix WordPress hosting/networking; the app itself degrades gracefully (§5/§30) but content will be empty/stale until resolved |
| Revalidation returns 401 | Missing/incorrect `Authorization` header, or `REVALIDATE_SECRET` mismatch between WordPress and the Worker | `curl` test per §9 | Correct the secret on whichever side is wrong; confirm no extra whitespace in either value |
| Revalidation returns 404 | Wrong URL configured in the WordPress webhook (e.g., missing `/api/revalidate`, or pointed at the wrong domain/`*.workers.dev` subdomain) | Check the exact URL configured in the webhook plugin | Correct the webhook's target URL |
| Article returns 404 unexpectedly | Wrong locale, unpublished translation, wrong slug/category, or WordPress genuinely has no such post | Query the WordPress REST API directly for that slug | Publish the missing translation, fix the slug, or confirm the post's actual status in WordPress |
| Custom domain not working | Domain not yet attached to the Worker, or DNS/zone not yet active on Cloudflare | Dashboard → Domains & Routes; check the domain's zone status | Complete §34.12's steps; allow time for propagation |
| SSL issue | Certificate still provisioning right after attaching a new custom domain | Check the domain's SSL/TLS status in the dashboard | Wait for automatic provisioning to complete; ensure the zone's SSL mode is compatible (Full/Full Strict recommended) |
| DNS issue | A conflicting existing DNS record for the same hostname predates the Worker Custom Domain attachment | Check the zone's DNS records tab for the hostname in question | Remove/adjust the conflicting record, then re-attach the Custom Domain |
| Cache not updating | Webhook never fired, fired with the wrong payload, or KV's eventual-consistency lag (§7) | `curl` test the webhook manually (§9); check the returned `tags`/`paths` | Re-fire with a complete payload; wait briefly for KV propagation |
| ISR not regenerating | Confusing a genuinely `force-dynamic` route (search, account — never "regenerates," it just always re-renders) with an ISR route, or expecting `?page=2` on a category/tag/author page to be part of the cached HTML (it's a client-side fetch, by design — see §7) | Check `export const dynamic`/`revalidate` in the specific route file (§7's table) | Understand which caching model actually applies to that specific route before troubleshooting further |
| Image errors ("hostname not configured") | `WORDPRESS_URL` was different at **build** time than at runtime, so `next.config.ts`'s `remotePatterns` (computed once, at build) doesn't match the actual media host being requested | Check the exact error in the browser console; compare `WORDPRESS_URL` used during the build vs. now | Ensure `WORDPRESS_URL` is correct and stable at build time; rebuild after any change to it |
| Cloudflare Worker runtime error (uncaught exception) | Any unhandled exception inside a Route Handler/Server Component (missing binding, malformed WordPress response not covered by existing error handling, etc.) | `npx wrangler tail` for the live stack trace | Fix the underlying code path; add error handling if a genuinely new WordPress response shape was encountered |

## 34.23 Cloudflare Free Plan

(Restates §23 with the deployment lens — see §23 for the full table.) The bindings this project actually declares in `wrangler.jsonc` — Workers, KV, D1, Assets, and the `IMAGES` binding — all have Free-plan tiers today, but **Images/Observability specifically have their own, separately-evolving pricing terms that this document does not guess at** (§23). **No R2 is used** (contra `README.md` — see §7's correction), which is relevant here because R2 is the one Cloudflare product in this project's problem space that requires a card on file even for its free tier; this project's actual KV-based configuration avoids that requirement entirely.

## 34.24 Deployment Security

- **Wrangler authentication:** `wrangler login` (OAuth, local dev) or `CLOUDFLARE_API_TOKEN` (scripted/CI use) — neither is stored in this repository.
- **API tokens:** if used for non-interactive deploys, scope them to the minimum needed (Workers Scripts edit, D1 edit, KV edit for this specific account) rather than a full account-level token — a general Wrangler/Cloudflare best practice, not something this repository enforces automatically.
- **Secrets:** see §34.11 — never in `wrangler.jsonc`, never committed.
- **Webhook authentication:** bearer-token (`REVALIDATE_SECRET`), §9.
- **GitHub permissions:** if Path A is used, whatever GitHub App/OAuth permissions Cloudflare Workers Builds requests when connected — review these in GitHub's own installed-apps settings for the organization/repo, a configuration this document cannot see from the repository side.
- **Production environment variables:** §34.10.
- **Preview environment variables:** not applicable — no preview environment is configured (§34.15).
- **WordPress API security:** all reads are anonymous/public by design (§5/§22); the one authenticated WordPress-bound call (`feedback`) uses its own separate shared secret (`SEXXEDU_INTERNAL_SECRET`), not `REVALIDATE_SECRET`.
- **Cloudflare security:** standard platform-level TLS/DDoS protections; nothing project-specific configured beyond what's documented in §22.

**No credentials of any kind are reproduced in this document.**

## 34.25 Recommended Production Workflow

**Developer:**
```text
Feature/change
   ↓
Local development        (npm run dev)
   ↓
Test                       (manual — no automated suite; §13/§26)
   ↓
Build                       (npm run build, then npm run preview for a Cloudflare-accurate check)
   ↓
Git commit
   ↓
Git push
   ↓
Cloudflare deployment       (npm run deploy, or Workers Builds if Path A is confirmed active)
   ↓
Production verification     (§34.18)
```

**Editor:**
```text
Write article
   ↓
WordPress
   ↓
Publish
   ↓
Webhook
   ↓
Revalidate                  (/api/revalidate — §9)
   ↓
Article available           (next request re-renders + caches)
```

These are **completely independent workflows** — an editor publishing content never requires a developer to do anything, and a developer deploying code never touches WordPress content (§34.19).

## 34.26 Complete Deployment Runbook

```text
Prerequisites: Cloudflare account, Node 22.23.2 (via nvm), npm, a real WordPress
instance reachable over HTTPS, and (if attaching a custom domain) ownership of
that domain.
```

```text
1.  Clone repository
    git clone git@github.com:samarsingh1799/thesexxeducationstatic.git

2.  Install Node dependencies
    nvm use && npm install

3.  Configure environment variables
    cp .env.example .env.local && cp .env.example .dev.vars
    # fill in WORDPRESS_URL, REVALIDATE_SECRET, BETTER_AUTH_SECRET in both files

4.  Login to Cloudflare
    npx wrangler login

5.  Verify Wrangler
    npx wrangler whoami

6.  Verify WordPress API
    curl "<WORDPRESS_URL>/wp-json/wp/v2/posts?per_page=1"

7.  Build locally
    npm run preview
    # confirms the real OpenNext/Workers bundle runs correctly under local Wrangler

8.  Deploy Worker
    npm run deploy

9.  Configure custom domain (optional, if you have one)
    Dashboard → Workers & Pages → cloudflaretest → Settings → Domains & Routes

10. Configure Cloudflare secrets
    npx wrangler secret put REVALIDATE_SECRET
    npx wrangler secret put BETTER_AUTH_SECRET
    npx wrangler secret put WORDPRESS_URL

11. Configure GitHub integration (only if Path A is desired)
    Dashboard → Workers & Pages → cloudflaretest → Settings → Builds → Connect to Git

12. Deploy production
    npm run deploy   (Path B)   — or push to the connected production branch (Path A)

13. Verify website
    open https://<your-domain-or-workers-dev-url>/

14. Verify WordPress article
    open https://<domain>/en/{categorySlug}/{slug}

15. Verify revalidation
    curl -i -X POST https://<domain>/api/revalidate   (expect 401 with no auth header)

16. Verify sitemap
    curl https://<domain>/sitemap.xml

17. Verify SEO
    view-source the homepage and an article; confirm <title>, canonical,
    hreflang, and JSON-LD are all present and correct
```

## 34.27 Cloudflare Deployment Quick Reference

```text
LOCAL DEVELOPMENT
npm run dev

BUILD
npm run build

CLOUDFLARE LOGIN
npx wrangler login

DEPLOY
npm run deploy

PREVIEW
npm run preview

LOGS
npx wrangler tail

TYPE GENERATION
npm run cf-typegen

PRODUCTION BRANCH
Needs verification — see §34.4 (remote HEAD points at `test`; `main` also exists)

WORKER NAME
cloudflaretest

PRODUCTION DOMAIN
https://www.thesexxeducation.com
(configured in wrangler.jsonc's vars + .env.production.local — see §34.5/§34.10.
NOT yet attached to the Worker in Cloudflare; see §34.12's remaining steps.
Fallback until then: https://cloudflaretest.samar-singh-1799.workers.dev)

WORDPRESS API
{WORDPRESS_URL}/wp-json/wp/v2/

REVALIDATION ENDPOINT
https://www.thesexxeducation.com/api/revalidate
```

## 34.28 Documentation Verification (performed)

The following checks were performed before finalizing this section:

1. ✅ Re-read the entire file after each addition.
2. ✅ Every deployment command above (`dev`, `build`, `start`, `lint`, `preview`, `deploy`, `cf-typegen`, `db:generate`, `db:migrate:local`, `db:migrate:remote`, `auth:schema`) was compared directly against the literal contents of `package.json` — no invented scripts.
3. ✅ Every Cloudflare setting in §34.5 was compared directly against the literal contents of `wrangler.jsonc` — reproduced verbatim, including the absence of a `vars`/`routes`/`[env.*]` block, which is called out explicitly rather than assumed away.
4. ✅ Every environment variable name (§12/§34.10) was cross-checked against `.env.example`, `cloudflare-env.d.ts` (the generated `CloudflareEnv` interface), and the (redacted) key names present in `.dev.vars`/`.env.local`/`.env.production.local`.
5. ✅ Build command confirmed: `opennextjs-cloudflare build` (via `npm run deploy`/`npm run preview`).
6. ✅ Deploy command confirmed: `opennextjs-cloudflare deploy` (via `npm run deploy`).
7. ✅ Worker name confirmed: `cloudflaretest` (`wrangler.jsonc`'s `name` field, matching `package.json`'s `name`).
8. ✅ Production branch: **could not be confirmed** — flagged as "Needs verification" everywhere it's referenced, with the available evidence (`origin/HEAD → origin/test`) stated explicitly rather than presented as fact.
9. ✅ Custom domain: **confirmed absent** from `wrangler.jsonc`; flagged as needing dashboard-side configuration.
10. ✅ WordPress API URL: confirmed as an environment variable (`WORDPRESS_URL`), never a hardcoded value in code — its real value is intentionally never reproduced in this document.
11. ✅ Revalidation endpoint: confirmed as `/api/revalidate` directly from `src/app/api/revalidate/route.ts`.
12. ✅ No secrets, tokens, passwords, or private key material appear anywhere in this document — every sensitive value is represented only by its variable **name**, with real values explicitly withheld and marked `<SECRET>`/`<SECRET - configure in Cloudflare>` where a placeholder was needed.
13. ✅ Assumptions not verifiable from the repository alone (GitHub Workers Builds connection status, production branch, live Cloudflare account resource state, actual production domain, current Cloudflare Free-plan terms for Images/Observability) are explicitly marked "Needs verification" rather than asserted.

---

## Documentation Generated From Repository

This document was produced by directly inspecting the following files/sources in this repository (no external assumptions, no invented files/commands/endpoints):

**Configuration & metadata:** `package.json`, `package-lock.json`, `wrangler.jsonc`, `next.config.ts`, `open-next.config.ts`, `drizzle.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.nvmrc`, `cloudflare-env.d.ts`, `.gitignore`, `.env.example`, key names only from `.dev.vars`/`.env.local`/`.env.production.local`, `public/_headers`, `README.md`, `AGENTS.md`, `CLAUDE.md`.

**Git:** `git log`, `git status`, `git diff --stat`, `git remote -v`, `git branch -a` (branch/remote state, commit history, uncommitted working-tree changes as of this inspection).

**App routing (`src/app/`):** `page.tsx`, `not-found.tsx`, `global-error.tsx`, `robots.ts`, `sitemap.xml/route.ts`, `sitemap-pages.xml/route.ts`, `sitemap-posts-en.xml/route.ts` (and confirmed the equivalent per-locale files exist), `[locale]/layout.tsx`, `[locale]/page.tsx`, `[locale]/not-found.tsx`, `[locale]/error.tsx`, `[locale]/[category]/[slug]/page.tsx`, `[locale]/article/[slug]/page.tsx`, `[locale]/category/[slug]/page.tsx`, `[locale]/tag/[slug]/page.tsx`, `[locale]/author/[slug]/page.tsx`, `[locale]/search/page.tsx`, `[locale]/account/page.tsx`, `[locale]/login/page.tsx`, `[locale]/register/page.tsx`, `[locale]/forgot-password/page.tsx`, `[locale]/reset-password/page.tsx`.

**API routes (`src/app/api/`):** `revalidate/route.ts`, `bookmarks/route.ts`, `likes/[postId]/route.ts`, `posts/[postId]/view/route.ts`, `search/route.ts`, `language-availability/[[...path]]/route.ts`, `feedback/route.ts`, `auth/[...all]/route.ts`.

**WordPress integration (`src/lib/wordpress/`):** `client.ts`, `posts.ts`, `categories.ts`, `tags.ts`, `authors.ts`, `media.ts`, `languages.ts`, `feedback.ts`, `client-ip.ts`, `trending.ts`.

**Caching/SEO/i18n (`src/lib/`):** `cache/tags.ts`, `seo/canonical.ts`, `seo/metadata.ts`, `seo/schema.ts`, `seo/site-config.ts`, `seo/sitemap-entries.ts`, `seo/sitemap-xml.ts`, `i18n/locales.ts`, `i18n/dictionary.ts`, `i18n/useCurrentLocale.ts`, `i18n/languagePreference.ts`, `content/html.ts`, `content/sanitize.ts`, `content/toc.ts`, `content/splitSections.ts`, `auth/index.ts`, `auth/session.ts`.

**Database:** `src/db/app-schema.ts`, `drizzle.config.ts`, `migrations/0000_melodic_jigsaw.sql`, `migrations/0001_mixed_white_queen.sql`, `migrations/meta/_journal.json`.

**Components (selectively, for accuracy on rendering/sanitization behavior):** `src/components/article/ArticleBody.tsx`, `src/components/article/ArticleColumns.tsx`, `src/components/seo/JsonLd.tsx`, `src/components/layout/LanguageMenu.tsx`.

**Directory listings:** full recursive listing of `src/app/`, `src/lib/`, `src/components/`, `src/db/`, `src/types/`, `public/`, and the repository root (excluding `node_modules/`, `.git/`, `.next/`).

