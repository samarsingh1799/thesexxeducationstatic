import Link from "next/link";
import { locale as getRootLocale } from "next/root-params";
import { getDictionary } from "@/lib/i18n/dictionary";
import { localizeCategoryTree } from "@/lib/i18n/categoryNames";
import { getCategoryHierarchy } from "@/lib/wordpress/categories";
import { siteConfig } from "@/lib/seo/site-config";
import { LanguageMenu } from "./LanguageMenu";
import { UserMenu } from "@/components/auth/UserMenu";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { DateTimeBadge } from "./DateTimeBadge";
import { SearchButton } from "./SearchButton";

export async function SiteHeader() {
  const [locale, dictionary, rawCategories] = await Promise.all([getRootLocale(), getDictionary(), getCategoryHierarchy()]);
  // WordPress category names are always English — see lib/i18n/categoryNames.ts
  // for why they need this separate, hand-maintained translation map rather
  // than the post-translation mechanism the rest of the site uses.
  const categories = localizeCategoryTree(rawCategories, dictionary);

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* Masthead row: menu trigger on the left, the wordmark centered, account actions on the right. */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="flex flex-1 items-center justify-start gap-4">
            <MobileNav categories={categories} latestLabel={dictionary.latestBreadcrumb} />
            <DateTimeBadge className="hidden text-sm text-ink-muted lg:block" />
          </div>

          <Link
            href={`/${locale}`}
            className="shrink-0 text-center font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-ink whitespace-nowrap tracking-tight hover:opacity-90 transition-opacity"
          >
            {siteConfig.name}
          </Link>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
            {/* Section-nav row (with its own SearchButton) is desktop-only, so mobile gets a plain search icon here instead. */}
            <SearchButton className="text-ink lg:hidden" categories={categories} locale={locale} />
            <LanguageMenu />
            <UserMenu dictionary={dictionary} />
          </div>
        </div>
      </div>

      {/* Mobile scrollable category pill bar */}
      {categories.length > 0 && (
        <div className="border-b border-white/10 bg-ink lg:hidden">
          <nav
            aria-label="Quick categories"
            className="flex items-center gap-1.5 overflow-x-auto px-3 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <Link
              href={`/${locale}/latest`}
              className="shrink-0 whitespace-nowrap rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white transition-colors hover:border-accent hover:text-accent"
            >
              {dictionary.latestBreadcrumb}
            </Link>
            {categories.slice(0, 10).map((category) => (
              <Link
                key={category.slug}
                href={`/${locale}/category/${category.slug}`}
                className="shrink-0 whitespace-nowrap rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white transition-colors hover:border-accent hover:text-accent"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Section-navigation row — desktop only; mobile reaches the same links through the drawer MobileNav opens above. */}
      <div className="hidden border-b border-white/10 bg-black lg:block">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <DesktopNav categories={categories} latestLabel={dictionary.latestBreadcrumb} />
        </div>
      </div>
    </header>
  );
}
