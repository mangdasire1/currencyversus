// Home page, right column, when a metal is selected: which metal the card is
// about and which metal page it links to. Pure — tested in
// home-metal-card.test.ts. Metals have no price history, so there is no chart
// to show; the card shows what the site has for that metal instead.

import { isMetal } from "./metals.ts"
import { METAL_PAGE_CURRENCIES, pairPath } from "./routes.ts"

// The metal on the base side, else the one on the target side (null for a
// currency pair). Gold → silver shows gold, the metal being converted.
export function selectedMetal(base: string, target: string): string | null {
  if (isMetal(base)) return base
  if (isMetal(target)) return target
  return null
}

// The metal's page in the other currency when it has one, else in US dollars
// (platinum and palladium have pages in four currencies only).
export function metalPagePath(metal: string, other: string): string {
  const currency = !isMetal(other) && METAL_PAGE_CURRENCIES[metal]?.includes(other) ? other : "USD"
  return pairPath(metal, currency)
}
