// Which pair pages get the new layout (Phase 7), and which of them are the
// measurement cohort. Two different things — keep them apart:
//
//   MEASUREMENT_COHORT  the 8 pages the 2026-11-20 Search Console read-out is
//                       computed over (layout shipped 2026-10-22). Fixed.
//   NEW_LAYOUT_PAIRS    every page that renders the new layout. The cohort
//                       plus the reverse direction of each cohort pair (Phase
//                       8), so a swap does not drop the user into the old
//                       layout. May grow.
//
// The layout check uses NEW_LAYOUT_PAIRS only; nothing in the UI branches
// on MEASUREMENT_COHORT directly (it feeds MEASURED_PAGES, which only keeps
// new links away from the measured pages).
// The reverse pages are not a control group: together they had 8 impressions
// in the three months before, too few to compare against. The control pages
// are eur-vs-try and sek-vs-inr (owner's decision, 2026-10-23).
//
// Roll back the new layout for all pages: make NEW_LAYOUT_PAIRS an empty array.

import { isValidPairRoute, parsePairSlug } from "./routes.ts"
import { isMetalCode } from "./conversion.ts"

// 20 November measurement cohort. DO NOT CHANGE.
// Any change to this list invalidates the measurement.
export const MEASUREMENT_COHORT: readonly string[] = [
  "eur-vs-chf", "aud-vs-usd", "eur-vs-gbp", "usd-vs-eur",
  "usd-vs-try", "usd-vs-jpy", "gbp-vs-usd", "usd-vs-cad",
]

// The reverse direction of each cohort pair (Phase 8).
export const REVERSE_PAIRS: readonly string[] = [
  "chf-vs-eur", "usd-vs-aud", "gbp-vs-eur", "eur-vs-usd",
  "try-vs-usd", "jpy-vs-usd", "usd-vs-gbp", "cad-vs-usd",
]

// Pages that render the new layout. Additions are allowed.
export const NEW_LAYOUT_PAIRS: readonly string[] = [...MEASUREMENT_COHORT, ...REVERSE_PAIRS]

// Control pages of the 20 November comparison (owner's decision 2026-10-23).
export const CONTROL_PAGES: readonly string[] = ["eur-vs-try", "sek-vs-inr"]

// Pages the 20 November read-out compares. Until then no new internal link
// may point at them (src/lib/related.ts): a change in their inbound links
// would be a second change next to the layout.
export const MEASURED_PAGES: ReadonlySet<string> = new Set([...MEASUREMENT_COHORT, ...CONTROL_PAGES])

const NEW_LAYOUT = new Set(NEW_LAYOUT_PAIRS)
const REVERSE = new Set(REVERSE_PAIRS)

export function hasNewLayout(slug: string): boolean {
  return NEW_LAYOUT.has(slug)
}

// Related links and the method link on new-layout pages: the reverse pairs
// only, so the cohort pages' visible content stays as measured.
export function isReversePair(slug: string): boolean {
  return REVERSE.has(slug)
}

// Fiat pairs only: metal pages have no historical series to chart.
export function isValidPilotSlug(slug: string): boolean {
  const pair = parsePairSlug(slug)
  return !!pair && isValidPairRoute(pair.base, pair.target) && !isMetalCode(pair.base) && !isMetalCode(pair.target)
}
