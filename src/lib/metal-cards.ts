import { METAL_SIGNIFICANT } from "./metal-units.ts"

// Home page Precious Metals cards: one precision rule for all four cards.
//
// The four sources quote with different precision (METAL_SIGNIFICANT: gold 6,
// silver 5, platinum 4, palladium 4 significant digits). Cards that sit side
// by side all use the precision of the least precise source — 4 significant
// digits — so no card shows a digit its source may not have given (gold-api
// returned gold as 4072.1 on 2026-11-08; "$4,072.10" added a cent digit) and
// no card is formatted by a different rule than its neighbour.
//
// - integer digits are never dropped ($4,072, not $4,070);
// - at most 2 decimals (cents), never more;
// - the same rule for the per-ounce and the per-gram line.
//
// Examples: $4,072 · $52.07 · $1,544 · $1,044; per gram $130.9 · $1.67.
// The metal pages keep each metal's own precision (src/lib/metal-units.ts).
export const CARD_SIGNIFICANT = Math.min(...Object.values(METAL_SIGNIFICANT))

export function cardDecimals(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0
  const intDigits = Math.floor(Math.log10(Math.abs(value))) + 1
  return Math.min(2, Math.max(0, CARD_SIGNIFICANT - intDigits))
}

export function formatCardUsd(value: number): string {
  const d = cardDecimals(value)
  return "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(value)
}
