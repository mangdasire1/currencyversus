// Turkish pilot pages (task C3): the Turkish home /tr/ and five pages, each
// paired with one English page. Pure — tested in tr-pages.test.ts.
//
// One list feeds everything that links the two languages, so they cannot
// drift apart:
// - hreflang both ways (en ↔ tr) plus x-default → the English page, on these
//   six pairs only; every other English page has no hreflang;
// - the visible language link ("Türkçe" / "English"), only where a pair exists;
// - the Turkish pages' breadcrumb trail and menu section. Both stay inside
//   the Turkish pages: only the "English" link leaves them.
// Addresses use no Turkish letters (ş, ğ, ı): /tr/dolar-tl/, /tr/gram-altin/.

import { SITE } from "./breadcrumbs.ts"
import type { Crumb } from "./breadcrumbs.ts"
import { YEARLY_PAIRS, yearlyPath, yearlyPairByTrPath, yearlyCrumbsTr } from "./by-year.ts"

export type TrSection = "currencies" | "metals" | "method"

export interface TrPage {
  tr: string // "/tr/dolar-tl/"
  en: string // "/usd-vs-try/"
  crumb: string // last step of the Turkish trail: "Dolar/TL"
  section: TrSection // menu entry marked current
}

export const TR_PAGES: readonly TrPage[] = [
  { tr: "/tr/dolar-tl/", en: "/usd-vs-try/", crumb: "Dolar/TL", section: "currencies" },
  { tr: "/tr/euro-tl/", en: "/eur-vs-try/", crumb: "Euro/TL", section: "currencies" },
  { tr: "/tr/gram-altin/", en: "/gold-vs-try/", crumb: "Gram altın", section: "metals" },
  { tr: "/tr/ons-altin/", en: "/gold-vs-usd/", crumb: "Ons altın", section: "metals" },
  { tr: "/tr/yontem/", en: "/method/", crumb: "Yöntem", section: "method" },
]

// The Turkish home, paired with the English one. Not in TR_PAGES: it lists
// those five, and has no trail of its own.
export const TR_HOME = { tr: "/tr/", en: "/" } as const

// Every Turkish page with its English pair.
export const TR_PAIRS: readonly { tr: string; en: string }[] = [TR_HOME, ...TR_PAGES]

// The Turkish page's menu section; by-year pages belong to Döviz.
export function trSection(trPath: string): TrSection {
  return yearlyPairByTrPath(trPath) ? "currencies" : trPage(trPath).section
}

export function trPage(trPath: string): TrPage {
  const p = TR_PAGES.find((x) => x.tr === trPath)
  if (!p) throw new Error(`not a Turkish page: ${trPath}`)
  return p
}

// By-year pages (task C2) with a Turkish version: USD/TRY and EUR/TRY. Kept
// apart from TR_PAIRS (which feeds the Turkish menu pages and their checks);
// they share its hreflang and language-link rules.
export const TR_YEARLY_PAIRS: readonly { tr: string; en: string }[] = YEARLY_PAIRS.filter((p) => p.tr).map((p) => ({
  tr: p.tr!.path,
  en: yearlyPath(p.base, p.target),
}))

const pairOf = (path: string) => [...TR_PAIRS, ...TR_YEARLY_PAIRS].find((p) => p.en === path || p.tr === path) ?? null

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

// Turkish menu. There are no Turkish index pages in the pilot, so Döviz and
// Altın lead to those two sections of the Turkish home, which lists every
// page of the section with its value.
export const TR_NAV = [
  { key: "currencies", href: "/tr/#doviz", label: "Döviz" },
  { key: "metals", href: "/tr/#altin", label: "Altın" },
  { key: "method", href: "/tr/yontem/", label: "Yöntem" },
] as const

// Turkish trail: Ana sayfa › Dolar/TL. Two steps, since every step of a trail
// is a real page (breadcrumbs.ts) and a section of /tr/ is not one; the site
// owner chose this over a middle step linking to /tr/#doviz (2026-11-22).
export function trCrumbs(trPath: string): Crumb[] {
  // a by-year page sits under its pair page: Ana sayfa › Dolar/TL › Yıllara göre
  const yearly = yearlyPairByTrPath(trPath)
  if (yearly) return yearlyCrumbsTr(yearly)
  return [
    { name: "Ana sayfa", path: TR_HOME.tr },
    { name: trPage(trPath).crumb, path: trPath },
  ]
}
