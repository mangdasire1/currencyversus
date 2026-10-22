// Pilot set for the new pair-page layout (Phase 7).
//
// The same code serves every page; only the slugs below get the new layout.
// The set is small and fixed on purpose: the other 233 pages are the control
// group for a before/after comparison in Search Console. Do not grow it
// without deciding to end the comparison.
//
// Roll back the new layout for all pages: make PILOT_PAIRS an empty array.

import { isValidPairRoute, parsePairSlug } from "./routes.ts"
import { isMetalCode } from "./conversion.ts"

export const PILOT_PAIRS: readonly string[] = [
  "eur-vs-chf", // most impressions in Search Console (owner's export)
  "usd-vs-try", // extreme long-run moves; traffic from Turkey
  // No Search Console export in the repo, so the remaining six are major,
  // heavily searched pairs (owner to approve):
  "usd-vs-eur", // "exchange rate usd to eur" was among the observed queries (Phase 5 brief)
  "gbp-vs-usd", // GBP/USD, quoted with GBP as base
  "usd-vs-jpy", // USD/JPY, quoted with USD as base
  "eur-vs-gbp", // EUR/GBP, quoted with EUR as base
  "usd-vs-cad", // USD/CAD, quoted with USD as base
  "aud-vs-usd", // AUD/USD, quoted with AUD as base
]

const PILOT = new Set(PILOT_PAIRS)

export function isPilot(slug: string): boolean {
  return PILOT.has(slug)
}

// Fiat pairs only: metal pages have no historical series to chart.
export function isValidPilotSlug(slug: string): boolean {
  const pair = parsePairSlug(slug)
  return !!pair && isValidPairRoute(pair.base, pair.target) && !isMetalCode(pair.base) && !isMetalCode(pair.target)
}
