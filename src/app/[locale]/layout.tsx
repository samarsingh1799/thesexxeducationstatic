import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Script from "next/script";
import dynamic from "next/dynamic";
import { Plus_Jakarta_Sans, Geist_Mono, Playfair_Display } from "next/font/google";
import { isSupportedLocale, locales, getLocaleConfig } from "@/lib/i18n/locales";
import { siteConfig } from "@/lib/seo/site-config";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { AuthModal } from "@/components/auth/AuthModal";
import { JsonLd } from "@/components/seo/JsonLd";
import { getOrganizationSchema, getWebsiteSchema } from "@/lib/seo/schema";
import "../globals.css";

// Code-split out of the root bundle (mounted on every page) — it's a
// floating widget nobody interacts with on first paint.
const FeedbackWidget = dynamic(() => import("@/components/feedback/FeedbackWidget").then((mod) => mod.FeedbackWidget));

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

const plusJakartaSans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Editorial serif for the header/footer wordmark only — everything else stays on Plus Jakarta Sans.
const playfairDisplay = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

// Every configured locale is prerendered at build time — this is the
// site's entire top-level route fan-out (4 locales today), cheap either
// way, and it's what makes `/hi`, `/es`, `/fr` static/ISR-eligible instead
// of a plain per-request dynamic function (see the [category]/[slug]
// route for why that distinction matters for caching).
export async function generateStaticParams() {
  return locales.map((locale) => ({ locale: locale.code }));
}

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  metadataBase: new URL(siteConfig.url),
  // Inert — no script, no network request. A separate signal from the
  // site-ownership verification script below; Google uses it to associate
  // the site with this AdSense account (e.g. Search Console's AdSense report).
  ...(adsenseClientId && { other: { "google-adsense-account": adsenseClientId } }),
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return (
    <html lang={getLocaleConfig(locale)?.bcp47 ?? locale}>
      <head>
        {gaMeasurementId && (
          <>
            {/* Google tag (gtag.js) */}
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>
          </>
        )}
        {adsenseClientId && (
          // Deliberately a plain <script> tag, not next/script: every
          // next/script strategy (including beforeInteractive) routes
          // through Next's internal loader rather than emitting a literal
          // <script src> element, so the raw HTML never contains the exact
          // tag Google's AdSense site-verification crawler scans for (it
          // reads source, it doesn't execute JS).
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body
        className={`${plusJakartaSans.variable} ${geistMono.variable} ${playfairDisplay.variable} min-h-screen bg-background font-sans text-ink antialiased flex flex-col`}
      >
        <JsonLd data={[getOrganizationSchema(), getWebsiteSchema()]} />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <FeedbackWidget />
        <ScrollToTop />
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      </body>
    </html>
  );
}
