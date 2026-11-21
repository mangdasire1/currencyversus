// Breadcrumb trails (package B2/B7). Pure — tested in breadcrumbs.test.ts.
//
// One list per page feeds both the visible trail (components/Breadcrumbs.tsx)
// and the BreadcrumbList structured data, so the two cannot drift apart.
// Every step is a real page: Currencies is /currencies/ and Metals is
// /metals/ (both generated pages), never a section of the home page.
//
// Google's breadcrumb guidelines: at least two ListItems; each has position,
// name and item (item optional on the last one — given here anyway, as the
// absolute URL of the page itself).

import { CURRENCIES } from "./currencies.ts"
import { METALS } from "./metals.ts"
import { pairPath } from "./routes.ts"

export const SITE = "https://currencyversus.com"

export interface Crumb {
  name: string
  path: string // "/currencies/" — site-relative, trailing slash
}

const HOME: Crumb = { name: "Home", path: "/" }
const CURRENCIES_CRUMB: Crumb = { name: "Currencies", path: "/currencies/" }
const METALS_CRUMB: Crumb = { name: "Metals", path: "/metals/" }

const METAL_NAME: Record<string, string> = Object.fromEntries(METALS.map((m) => [m.code, m.name]))
const isCurrency = (code: string) => CURRENCIES.some((c) => c.code === code)

// Currency pair page: Home › Currencies › USD to TRY
export function pairCrumbs(base: string, target: string): Crumb[] {
  if (!isCurrency(base) || !isCurrency(target)) throw new Error(`not a currency pair: ${base}/${target}`)
  return [HOME, CURRENCIES_CRUMB, { name: `${base} to ${target}`, path: pairPath(base, target) }]
}

// Metal page: Home › Metals › Gold in USD
export function metalCrumbs(metal: string, currency: string): Crumb[] {
  const name = METAL_NAME[metal]
  if (!name || !isCurrency(currency)) throw new Error(`not a metal page: ${metal}/${currency}`)
  return [HOME, METALS_CRUMB, { name: `${name} in ${currency}`, path: pairPath(metal, currency) }]
}

// Gold/silver page: Home › Metals › Gold/silver ratio
export function ratioCrumbs(): Crumb[] {
  return [HOME, METALS_CRUMB, { name: "Gold/silver ratio", path: pairPath("XAU", "XAG") }]
}

// Index pages: Home › Currencies, Home › Metals
export function indexCrumbs(index: "currencies" | "metals"): Crumb[] {
  return [HOME, index === "currencies" ? CURRENCIES_CRUMB : METALS_CRUMB]
}

export function breadcrumbSchema(crumbs: Crumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE}${c.path}`,
    })),
  }
}
