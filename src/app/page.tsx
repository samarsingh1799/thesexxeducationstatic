import { permanentRedirect } from "next/navigation";
import { defaultLocale } from "@/lib/i18n/locales";

/**
 * The bare domain root ("/") has no `[locale]` segment to match at all
 * (a dynamic segment requires at least one path value), so without this
 * file it 404s instead of landing anywhere real. A single, unconditional
 * redirect to the default locale — not based on Accept-Language or any
 * other per-visitor signal — so every visitor (and Googlebot) gets the
 * exact same, stable result every time; inferring a locale from request
 * headers here would make "/" resolve inconsistently depending on who's
 * asking, which is exactly what search engines' own guidance on
 * language redirects warns against.
 */
export default function RootPage() {
  permanentRedirect(`/${defaultLocale}`);
}
