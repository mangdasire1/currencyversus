// Turkish pilot pages (task C3): five Turkish pages, each paired with one
// English page. Pure — tested in tr-pages.test.ts.
//
// One list feeds everything that links the two languages, so they cannot
// drift apart:
// - hreflang both ways (en ↔ tr) plus x-default → the English page, on these
//   five pairs only; every other English page has no hreflang;
// - the visible language link ("Türkçe" / "English"), only where a pair exists;
// - the Turkish pages' breadcrumb trail and menu section.
// Addresses use no Turkish letters (ş, ğ, ı): /tr/dolar-tl/, /tr/gram-altin/.

import { SITE } from "./breadcrumbs.ts"
import type { Crumb } from "./breadcrumbs.ts"

export type TrSection = "currencies" | "metals" | "method"

export interface TrPage {
  tr: string // "/tr/dolar-tl/"
  en: string // "/usd-vs-try/"
  crumb: string // last step of the Turkish trail: "Dolar/TL"
  section: TrSection // menu entry marked current; the trail's middle step
}

export const TR_PAGES: readonly TrPage[] = [
  { tr: "/tr/dolar-tl/", en: "/usd-vs-try/", crumb: "Dolar/TL", section: "currencies" },
  { tr: "/tr/euro-tl/", en: "/eur-vs-try/", crumb: "Euro/TL", section: "currencies" },
  { tr: "/tr/gram-altin/", en: "/gold-vs-try/", crumb: "Gram altın", section: "metals" },
  { tr: "/tr/ons-altin/", en: "/gold-vs-usd/", crumb: "Ons altın", section: "metals" },
  { tr: "/tr/yontem/", en: "/method/", crumb: "Yöntem", section: "method" },
]

export function trPage(trPath: string): TrPage {
  const p = TR_PAGES.find((x) => x.tr === trPath)
  if (!p) throw new Error(`not a Turkish page: ${trPath}`)
  return p
}

const pairOf = (path: string) => TR_PAGES.find((p) => p.en === path || p.tr === path) ?? null

// hreflang for a page of either language: both versions and x-default (the
// English page). null for a page without a Turkish/English pair.
export function hreflangFor(path: string): Record<string, string> | null {
  const p = pairOf(path)
  if (!p) return null
  return { en: `${SITE}${p.en}`, tr: `${SITE}${p.tr}`, "x-default": `${SITE}${p.en}` }
}

// Metadata `alternates` for a page: its canonical (itself) and, only when it
// has a pair, the hreflang languages. A page's `alternates` replaces the
// layout's, so both go together.
export function alternatesFor(path: string): { canonical: string; languages?: Record<string, string> } {
  const languages = hreflangFor(path)
  return languages ? { canonical: `${SITE}${path}`, languages } : { canonical: `${SITE}${path}` }
}

export interface LanguageLink {
  href: string // the other language's page
  label: string // in that language: "Türkçe" / "English"
  lang: "tr" | "en"
}

// The visible link to the same page in the other language; null when the
// page has no pair (no link is shown).
export function languageLinkFor(path: string): LanguageLink | null {
  const p = pairOf(path)
  if (!p) return null
  return path === p.en ? { href: p.tr, label: "Türkçe", lang: "tr" } : { href: p.en, label: "English", lang: "en" }
}

// Turkish menu: the site's three sections. The currency and metal indexes
// exist in English only (pilot), so those two entries lead to the English
// index pages; the method entry has its Turkish page.
export const TR_NAV = [
  { key: "currencies", href: "/currencies/", label: "Döviz" },
  { key: "metals", href: "/metals/", label: "Metaller" },
  { key: "method", href: "/tr/yontem/", label: "Yöntem" },
] as const

// Turkish trail: Ana sayfa › Döviz › Dolar/TL, Ana sayfa › Altın › Gram altın,
// Ana sayfa › Yöntem. Ana sayfa, Döviz and Altın are the English home and
// index pages (no Turkish ones in the pilot).
const TR_HOME: Crumb = { name: "Ana sayfa", path: "/" }
const TR_SECTION: Record<Exclude<TrSection, "method">, Crumb> = {
  currencies: { name: "Döviz", path: "/currencies/" },
  metals: { name: "Altın", path: "/metals/" },
}

export function trCrumbs(trPath: string): Crumb[] {
  const p = trPage(trPath)
  const self: Crumb = { name: p.crumb, path: p.tr }
  return p.section === "method" ? [TR_HOME, self] : [TR_HOME, TR_SECTION[p.section], self]
}
