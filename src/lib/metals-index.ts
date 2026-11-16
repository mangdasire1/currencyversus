// What the /metals/ index page lists (Phase A6). Pure — tested in
// metals-index.test.ts, used by the page and by scripts/verify-metals.mjs.
//
// The page is the internal-link hub for the metal pages: every metal page the
// build generates is linked from it, by a descriptive text. The list comes
// from the route catalog's own tables, so a metal or a currency added there
// appears here without another edit.

import { METALS } from "./metals.ts"
import { CURRENCIES } from "./currencies.ts"
import { METAL_PAGE_CURRENCIES, pairSlug } from "./routes.ts"

export interface MetalsIndexLink {
  href: string // "/gold-vs-usd/"
  text: string // "Gold price in US Dollar (USD)"
  currency: string
}

export interface MetalsIndexEntry {
  code: string // "XAU"
  name: string // "Gold"
  links: MetalsIndexLink[]
}

const CURRENCY_NAME: Record<string, string> = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.name]))

export const METALS_INDEX_PATH = "/metals/"
export const RATIO_LINK = { href: `/${pairSlug("XAU", "XAG")}/`, text: "Gold/silver ratio: how many ounces of silver one ounce of gold buys" }

export function metalsIndex(): MetalsIndexEntry[] {
  return METALS.map((m) => ({
    code: m.code,
    name: m.name,
    links: METAL_PAGE_CURRENCIES[m.code].map((c) => ({
      href: `/${pairSlug(m.code, c)}/`,
      text: `${m.name} price in ${CURRENCY_NAME[c]} (${c})`,
      currency: c,
    })),
  }))
}

// Every metal page address the index must link to (38 metal pages + the ratio).
export function metalsIndexTargets(): string[] {
  return [...metalsIndex().flatMap((e) => e.links.map((l) => l.href)), RATIO_LINK.href]
}
