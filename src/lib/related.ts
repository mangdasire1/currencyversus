// "Related comparisons" links (Phase 8). Pure — tested in related.test.ts.
//
// Shown on metal pages, the gold/silver page and the reverse pairs only —
// not on the 20 November cohort. No link points at a measured page (cohort or
// control, src/lib/pilot.ts MEASURED_PAGES) or at the page itself: a new
// internal link to a measured page would change it during the measurement.

import { MEASURED_PAGES } from "./pilot.ts"
import { pairSlug, isValidPairRoute } from "./routes.ts"
import { CURRENCIES } from "./currencies.ts"

export interface RelatedLink {
  href: string // /slug/ (trailingSlash: true)
  text: string // descriptive link text
}

export const METHOD_LINK: RelatedLink = { href: "/method/", text: "How the rates and prices are sourced and calculated" }

const NAME: Record<string, string> = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.name]))
const METAL_SLUG: Record<string, string> = { XAU: "gold", XAG: "silver" }
const METAL_NAME: Record<string, string> = { XAU: "Gold", XAG: "Silver" }
const MAJORS = ["USD", "EUR", "GBP", "JPY", "CHF"]

function allowed(slug: string, self: string): boolean {
  return slug !== self && !MEASURED_PAGES.has(slug)
}

function link(slug: string, text: string): RelatedLink {
  return { href: `/${slug}/`, text }
}

// Metal page (gold-vs-try): the same metal in other currencies, the other
// metal in this currency, the gold/silver ratio, the method page.
export function metalRelatedLinks(metal: string, currency: string): RelatedLink[] {
  const self = `${METAL_SLUG[metal]}-vs-${currency.toLowerCase()}`
  const other = metal === "XAU" ? "XAG" : "XAU"
  const out: RelatedLink[] = []
  for (const c of MAJORS.filter((c) => c !== currency).slice(0, 3)) {
    out.push(link(`${METAL_SLUG[metal]}-vs-${c.toLowerCase()}`, `${METAL_NAME[metal]} price in ${NAME[c]} (${c})`))
  }
  out.push(link(`${METAL_SLUG[other]}-vs-${currency.toLowerCase()}`, `${METAL_NAME[other]} price in ${NAME[currency]} (${currency})`))
  out.push(link("gold-vs-silver", "Gold/silver ratio: how many ounces of silver one ounce of gold buys"))
  return [...out.filter((l) => allowed(l.href.slice(1, -1), self)), METHOD_LINK]
}

export function ratioRelatedLinks(): RelatedLink[] {
  // Gold in four currencies is already linked on that page ("Explore Metal Prices")
  return [link("silver-vs-usd", "Silver price in US Dollar (USD)"), link("silver-vs-eur", "Silver price in Euro (EUR)"), METHOD_LINK]
}

// Reverse pair (try-vs-usd): the base against other major currencies, gold in
// the base currency, the method page. Measured pages are skipped, so the
// cohort direction of this pair is never linked.
export function pairRelatedLinks(base: string, target: string): RelatedLink[] {
  const self = pairSlug(base, target)
  const out: RelatedLink[] = []
  for (const c of MAJORS) {
    if (out.length === 3) break
    if (c === base || c === target || !isValidPairRoute(base, c)) continue
    const slug = pairSlug(base, c)
    if (allowed(slug, self)) out.push(link(slug, `${NAME[base]} to ${NAME[c]} (${base}/${c}) exchange rate`))
  }
  out.push(link(`gold-vs-${base.toLowerCase()}`, `Gold price in ${NAME[base]} (${base})`))
  return [...out, METHOD_LINK]
}
