import Link from "next/link";
import Image from "next/image";
import { locale as getRootLocale } from "next/root-params";
import { siteConfig } from "@/lib/seo/site-config";
import { getAllCategories } from "@/lib/wordpress/categories";
import { getDictionary } from "@/lib/i18n/dictionary";
import { localizeCategoryName } from "@/lib/i18n/categoryNames";

const MAX_FOOTER_CATEGORIES = 6;

export async function SiteFooter() {
  const [locale, allCategories, dictionary] = await Promise.all([getRootLocale(), getAllCategories(), getDictionary()]);
  const categories = allCategories.slice(0, MAX_FOOTER_CATEGORIES);

  return (
    <footer className="mt-16 border-t border-border bg-white text-sm text-ink-muted">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-ink hover:opacity-90 transition-opacity">
              <Image src="/logo-mark.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
              <span className="font-serif text-xl font-bold tracking-tight text-ink">{siteConfig.name}</span>
            </Link>
            <p className="mt-3 max-w-xs">{dictionary.homeDescription}</p>
            <p className="mt-1 max-w-xs">Educational Sexual Health &amp; Wellness</p>
          </div>

          {categories.length > 0 && (
            <nav aria-label="Footer categories">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink">Categories</p>
              <ul className="mt-3 space-y-2">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link href={`/${locale}/category/${category.slug}`} className="hover:text-accent hover:underline">
                      {localizeCategoryName(category, dictionary)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <nav aria-label="Information links">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink">Information</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href={`/${locale}/about-us`} className="hover:text-accent hover:underline">About Us</Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-accent hover:underline">Contact</Link>
              </li>
              <li>
                <Link href={`/${locale}/editorial-policy`} className="hover:text-accent hover:underline">Editorial Policy</Link>
              </li>
              <li>
                <Link href={`/${locale}/corrections-policy`} className="hover:text-accent hover:underline">Corrections</Link>
              </li>
              <li>
                <Link href={`/${locale}/accessibility`} className="hover:text-accent hover:underline">Accessibility</Link>
              </li>
              <li>
                <Link href={`/${locale}/age-content-notice`} className="hover:text-accent hover:underline">Age &amp; Content Notice</Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal links">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink">Legal</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href={`/${locale}/privacy-policy`} className="hover:text-accent hover:underline">Privacy Policy</Link>
              </li>
              <li>
                <Link href={`/${locale}/cookie-policy`} className="hover:text-accent hover:underline">Cookie Policy</Link>
              </li>
              <li>
                <Link href={`/${locale}/terms-and-conditions`} className="hover:text-accent hover:underline">Terms &amp; Conditions</Link>
              </li>
              <li>
                <Link href={`/${locale}/health-disclaimer`} className="hover:text-accent hover:underline">Health Disclaimer</Link>
              </li>
              <li>
                <Link href={`/${locale}/copyright`} className="hover:text-accent hover:underline">Copyright</Link>
              </li>
              <li>
                <Link href={`/${locale}/advertising-disclosure`} className="hover:text-accent hover:underline">Advertising Disclosure</Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6">
          <p className="text-xs">
            {siteConfig.name} provides general educational information about sexual health, relationships and
            wellbeing. Our content is not a substitute for professional medical advice.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs">
              &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <li><Link href={`/${locale}/about-us`} className="hover:text-accent hover:underline">About</Link></li>
              <li><Link href={`/${locale}/contact`} className="hover:text-accent hover:underline">Contact</Link></li>
              <li><Link href={`/${locale}/editorial-policy`} className="hover:text-accent hover:underline">Editorial Policy</Link></li>
              <li><Link href={`/${locale}/privacy-policy`} className="hover:text-accent hover:underline">Privacy</Link></li>
              <li><Link href={`/${locale}/cookie-policy`} className="hover:text-accent hover:underline">Cookies</Link></li>
              <li><Link href={`/${locale}/terms-and-conditions`} className="hover:text-accent hover:underline">Terms</Link></li>
              <li><Link href={`/${locale}/health-disclaimer`} className="hover:text-accent hover:underline">Health Disclaimer</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
