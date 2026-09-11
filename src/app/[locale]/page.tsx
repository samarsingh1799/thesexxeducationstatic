import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPosts } from "@/lib/wordpress/posts";
import { getCategoryHierarchy } from "@/lib/wordpress/categories";
import { getAllAuthors } from "@/lib/wordpress/authors";
import { getTranslatedPostSummaries } from "@/lib/wordpress/languages";
import { getTrendingPosts } from "@/lib/wordpress/trending";
import { getDictionary } from "@/lib/i18n/dictionary";
import { isSupportedLocale } from "@/lib/i18n/locales";
import type { Category } from "@/types/content";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getTranslationUrls } from "@/lib/seo/canonical";
import { siteConfig } from "@/lib/seo/site-config";
import { HeroSlider } from "@/components/home/HeroSlider";
import { CurrentAndTrending } from "@/components/home/CurrentAndTrending";
import { CategorySpotlight } from "@/components/home/CategorySpotlight";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { AuthorSpotlight } from "@/components/home/AuthorSpotlight";
import { Newsletter } from "@/components/home/Newsletter";
import { ArticleMeta } from "@/components/article/ArticleMeta";
import { AdSlot } from "@/components/ads/AdSlot";

export const revalidate = false;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

type RouteParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: siteConfig.name,
    description: siteConfig.description,
    path: `/${locale}`,
    translations: getTranslationUrls("/"),
  });
}

export default async function HomePage({ params }: RouteParams) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const [dictionary, { items: englishPosts }, categoryTree, authors] = await Promise.all([
    getDictionary(),
    getPosts({ perPage: 35 }),
    getCategoryHierarchy(),
    getAllAuthors(),
  ]);
  const posts = await getTranslatedPostSummaries(englishPosts, locale);

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="sr-only">{siteConfig.name}</h1>
        <p className="text-ink-muted">{dictionary.noArticles}</p>
      </div>
    );
  }

  const heroSlides = posts.slice(0, 3);
  const sidebarLatest = posts.slice(3, 8);
  const currentPosts = posts.slice(8, 14);
  const remainingPosts = posts.slice(14);

  const shownIds = [...heroSlides, ...sidebarLatest, ...currentPosts].map((post) => post.id);
  const trending = await getTrendingPosts(5, shownIds);

  const showcaseSections = categoryTree
    .map((category) => {
      const childSlugs = category.children.map((c: Category) => c.slug);
      const categoryPosts = remainingPosts
        .filter((post) => post.category?.slug === category.slug || (post.category && childSlugs.includes(post.category.slug)))
        .slice(0, 5);
      return { category, posts: categoryPosts };
    })
    .filter((section) => section.posts.length >= 2)
    .slice(0, 4);

  const spotlightSection = showcaseSections.length > 0 ? showcaseSections[0] : null;
  const restShowcaseSections = showcaseSections.slice(1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="sr-only">{siteConfig.name}</h1>

      <section aria-labelledby="featured-heading">
        <div className="border-t border-border" />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className={sidebarLatest.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="flex items-start justify-between">
              <div className="inline-block rounded-b-md bg-[#171717] px-5 py-1 shadow-sm">
                <span id="featured-heading" className="text-[11px] font-bold tracking-[0.25em] text-white uppercase">
                  FEATURED
                </span>
              </div>
            </div>
            <div className="mt-6">
              <HeroSlider posts={heroSlides} locale={locale} />
            </div>
          </div>

          {sidebarLatest.length > 0 && (
            <div className="lg:col-span-1">
              <div className="flex items-start justify-between">
                <div className="inline-block rounded-b-md bg-[#171717] px-5 py-1 shadow-sm">
                  <span id="latest-heading" className="text-[11px] font-bold tracking-[0.25em] text-white uppercase">
                    LATEST ARTICLE
                  </span>
                </div>
                <Link
                  href={`/${locale}/latest`}
                  className="pt-2 text-sm font-semibold text-accent hover:text-accent transition-colors"
                >
                  See all →
                </Link>
              </div>
              <ol className="mt-6 divide-y divide-border">
                {sidebarLatest.map((post, index) => (
                  <li key={post.slug} className="flex gap-4 py-4 first:pt-0">
                    <span aria-hidden="true" className="font-serif text-2xl text-ink-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug text-ink">
                        <Link href={`/${locale}/${post.category?.slug ?? "article"}/${post.slug}`} className="hover:underline">
                          {post.title}
                        </Link>
                      </h3>
                      <div className="mt-1">
                        <ArticleMeta author={post.author} publishedAt={post.publishedAt} size="compact" locale={locale} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      {categoryTree.length > 0 && (
        <nav
          aria-label="Browse by category"
          className="mt-8 flex gap-2 sm:gap-2.5 overflow-x-auto bg-black px-4 py-3 sm:py-3.5 border border-white/10 -mx-4 rounded-none border-x-0 sm:mx-0 sm:rounded-xl sm:border-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categoryTree.map((category) => (
            <Link
              key={category.slug}
              href={`/${locale}/category/${category.slug}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-white/20 px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm font-medium text-white transition-colors hover:border-accent hover:text-accent"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      )}

      <CurrentAndTrending current={currentPosts} trending={trending} locale={locale} />

      {spotlightSection && <CategorySpotlight category={spotlightSection.category} posts={spotlightSection.posts} locale={locale} />}

      {restShowcaseSections.map(({ category, posts: sectionPosts }) => (
        <CategoryShowcase key={category.slug} category={category} posts={sectionPosts} allCategories={categoryTree} locale={locale} />
      ))}

      <AdSlot slotId="home-mid" label="Advertisement" minHeight={250} className="mt-10" />

      <AuthorSpotlight authors={authors.slice(0, 3)} locale={locale} />

      <Newsletter />
    </div>
  );
}
