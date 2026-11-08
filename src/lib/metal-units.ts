// Weight units for precious metals and the weight ⇄ money arithmetic.
// Pure — tested with `node --test` (src/lib/metal-units.test.ts).
//
// What gold-api.com returns (checked 2026-10-28, Phase 8):
//   - /price/XAU and /price/XAG answer { price, currency: "USD", symbol, ... }
//     with no unit field; the docs page does not name a unit, the home page
//     says "Per Oz.".
//   - The symbols are the ISO 4217 codes XAU / XAG, defined as one troy
//     ounce of the metal.
//   - Cross-check at the same minute: gold-api XAU 4043.8 vs the COMEX gold
//     future (USD per troy ounce) 4052.1, 0.2 % apart; per avoirdupois ounce
//     the troy price would have been 4436.6. Silver: 53.808 vs 53.695.
//   So `price` is USD per TROY ounce. Every conversion below starts from it.
//
// Platinum and palladium (checked 2026-11-08, Phase 10), same answer:
//   - /price/XPT {"name":"Platinum","price":1544.0,"symbol":"XPT",...} and
//     /price/XPD {"name":"Palladium","price":1044.0,"symbol":"XPD",...}; no
//     unit field. ISO 4217 defines XPT and XPD as one troy ounce of the metal.
//   - Independent quote (Kitco, last trading session 2026-11-06 17:00 UTC,
//     "unit":"OUNCE", "per troy ounce"): platinum bid 1534 / ask 1544 /
//     mid 1539, palladium bid 1004 / ask 1044 / mid 1024. gold-api is 0.3 %
//     and 2.0 % above the mid (equal to the ask); per avoirdupois ounce the
//     troy prices would have been 1694.0 and 1145.4, 10 % and 12 % off.
//   - The NYMEX futures on Yahoo had stopped updating on 2026-10-15, so they
//     were not used as the reference.

import { parseAmount, amountErrorMessage } from "./amount.ts"

// Exact by definition (international yard and pound agreement, 1959).
export const GRAMS_PER_TROY_OUNCE = 31.1034768
export const GRAMS_PER_AVOIRDUPOIS_OUNCE = 28.349523125

export type WeightUnit = "ozt" | "g" | "kg" | "oz"

export interface WeightUnitInfo {
  key: WeightUnit
  label: string // control text
  name: string // in running text: "troy ounces"
  one: string // "troy ounce"
  grams: number
}

// Troy ounce first: it is the default and the pricing unit.
// Out of scope on purpose: tola, tael (37.429 g in Hong Kong, 37.5 g in
// Taiwan — no single definition we could name), pennyweight, grain, karat.
export const WEIGHT_UNITS: readonly WeightUnitInfo[] = [
  { key: "ozt", label: "troy oz", name: "troy ounces", one: "troy ounce", grams: GRAMS_PER_TROY_OUNCE },
  { key: "g", label: "gram", name: "grams", one: "gram", grams: 1 },
  { key: "kg", label: "kg", name: "kilograms", one: "kilogram", grams: 1000 },
  { key: "oz", label: "oz (28.35 g)", name: "avoirdupois ounces", one: "avoirdupois ounce", grams: GRAMS_PER_AVOIRDUPOIS_OUNCE },
]
export const DEFAULT_WEIGHT_UNIT: WeightUnit = "ozt"

export function unitInfo(unit: WeightUnit): WeightUnitInfo {
  return WEIGHT_UNITS.find((u) => u.key === unit)!
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  return (value * unitInfo(from).grams) / unitInfo(to).grams
}

// Money for a weight, given the price of one troy ounce.
export function valueOfWeight(weight: number, unit: WeightUnit, pricePerTroyOunce: number): number {
  return convertWeight(weight, unit, "ozt") * pricePerTroyOunce
}

// Weight that a sum of money buys, in `unit`.
export function weightForValue(value: number, unit: WeightUnit, pricePerTroyOunce: number): number {
  return convertWeight(value / pricePerTroyOunce, "ozt", unit)
}

// Significant digits the provider's prices carry. The JSON values are
// float32 renderings of 2-decimal gold (4043.800049 = 4043.80) and 3-decimal
// silver (53.855999 = 53.856) prices: ~6 and ~5 significant digits.
// Platinum and palladium come in whole dollars (1544.0, 1044.0): 4.
export const METAL_SIGNIFICANT: Record<string, number> = { XAU: 6, XAG: 5, XPT: 4, XPD: 4 }

// Rounding for converter results (money and weights alike): by significant
// digits, not fixed decimals. A result never shows more significant digits
// than its least precise input (metal price; FX leg — see ecb.ts), but all
// integer digits are always kept and grouped with a thousands separator:
//   1 kg gold   ≈ 130,000 USD → "130,010"  (cents are noise at that size)
//   1 g silver  ≈ 1.73 USD    → "1.7300"   (two decimals would hide digits)
//   0.96 USD                  → "0.96123"
// Decimals are capped at 8; a non-zero value below that shows as "<0.00000001".
export function formatSignificant(n: number, sig: number): string {
  if (!Number.isFinite(n)) return "—"
  if (n === 0) return "0"
  const a = Math.abs(n)
  const intDigits = Math.floor(Math.log10(a)) + 1
  const decimals = Math.min(8, Math.max(0, sig - intDigits))
  if (a < 0.5 * 10 ** -decimals) return `<${(10 ** -decimals).toFixed(decimals)}`
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// One converter, two directions: the field the user typed in is the input,
// the other one is computed. Same input policy as every amount on the site
// (amount.ts): empty is neutral, negatives and non-numbers are rejected with
// a message, zero is a valid amount. Never throws.
export type ConverterSide = "weight" | "value"

export interface ConverterSolution {
  weight: number | null
  value: number | null
  error: string | null
}

export function solveConverter(
  text: string,
  side: ConverterSide,
  unit: WeightUnit,
  pricePerTroyOunce: number | null
): ConverterSolution {
  const parsed = parseAmount(text)
  if (!parsed.ok) return { weight: null, value: null, error: amountErrorMessage(parsed.reason) }
  const price = pricePerTroyOunce !== null && Number.isFinite(pricePerTroyOunce) && pricePerTroyOunce > 0 ? pricePerTroyOunce : null
  if (side === "weight") {
    return { weight: parsed.value, value: price !== null ? valueOfWeight(parsed.value, unit, price) : null, error: null }
  }
  return { weight: price !== null ? weightForValue(parsed.value, unit, price) : null, value: parsed.value, error: null }
}
