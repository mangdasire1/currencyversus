// What the /currencies/ index page lists. Pure — tested in
// currencies-index.test.ts, used by the page and by scripts/verify-routes.mjs.
//
// The page is the internal-link hub for the currency pair pages: one section
// per currency, linking to that currency against each of the others. The list
// comes from the currency table and the route catalog, so a currency added
// there appears here without another edit.

import { CURRENCIES } from "./currencies.ts"
import { pairSlug, isValidPairRoute } from "./routes.ts"

export interface CurrenciesIndexLink {
  href: string // "/usd-vs-try/"
  text: string // "US Dollar to Turkish Lira (USD/TRY)"
  target: string
}

export interface CurrenciesIndexEntry {
  code: string
  name: string
  links: CurrenciesIndexLink[]
}

export const CURRENCIES_INDEX_PATH = "/currencies/"

export function currenciesIndex(): CurrenciesIndexEntry[] {
  return CURRENCIES.map((base) => ({
    code: base.code,
    name: base.name,
    links: CURRENCIES.filter((t) => t.code !== base.code && isValidPairRoute(base.code, t.code)).map((t) => ({
      href: `/${pairSlug(base.code, t.code)}/`,
      text: `${base.name} to ${t.name} (${base.code}/${t.code})`,
      target: t.code,
    })),
  }))
}

// Every pair page address the index links to (all currency pairs).
export function currenciesIndexTargets(): string[] {
  return currenciesIndex().flatMap((e) => e.links.map((l) => l.href))
}
