// ECB reference rates: cross rates and their real precision.
// Pure — tested with `node --test` (src/lib/ecb.test.ts).
//
// The ECB publishes one rate per currency against the euro. Every other pair
// is a cross rate. Frankfurter's `?base=USD` / `?base=TRY` answers are such
// crosses, each rounded by the provider to 5 significant digits on its own:
// for ECB 2026-10-23 it returned USD→TRY 49.738 and TRY→USD 0.020105, whose
// inverse is 49.7389 — so the USD/TRY and TRY/USD pages disagreed.
// We therefore always request the euro rates themselves (no `base=`) and
// divide here at full float precision. A→B and B→A are then exact inverses
// of the same raw numbers; rounding happens only when a rate is displayed.

// Decimals the ECB publishes per currency (fixed per currency; see
// https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml).
export const ECB_DECIMALS: Record<string, number> = {
  USD: 4, JPY: 2, GBP: 5, CHF: 4, CAD: 4, AUD: 4, TRY: 4,
  CNY: 4, INR: 4, BRL: 4, KRW: 2, SEK: 4, MXN: 4, SGD: 4,
}

// Significant digits of the current ECB publication per currency: the fixed
// decimals plus the integer digits of the EUR rate (ECB 2026-10-28: CHF
// 0.9247 → 4, USD 1.1133 → 5, GBP 0.83785 → 5, JPY 175.86 → 5, TRY 55.4846
// → 6). src/lib/ecb.test.ts recomputes this table from that publication.
// Accepted limit: an old rate whose euro leg was on the other side of a
// power of ten (e.g. EUR/USD below 1) had one digit less at the source; it
// is shown with today's precision for the pair.
export const ECB_SIGNIFICANT: Record<string, number> = {
  USD: 5, JPY: 5, GBP: 5, CHF: 4, CAD: 5, AUD: 5, TRY: 6,
  CNY: 5, INR: 7, BRL: 5, KRW: 6, SEK: 6, MXN: 6, SGD: 5,
}

// A cross rate is as precise as the less precise of its two euro legs. EUR
// itself is exact (1 EUR = 1 EUR), so a EUR pair has the precision of the
// other currency.
export function pairSignificantDigits(base: string, target: string): number {
  const leg = (code: string) => (code === "EUR" ? Infinity : (ECB_SIGNIFICANT[code] ?? 4))
  const sig = Math.min(leg(base), leg(target))
  return Number.isFinite(sig) ? sig : 5
}

// Codes to request from the euro endpoint for this pair (EUR is implicit).
export function eurSymbols(codes: string[]): string[] {
  return [...new Set(codes.filter((c) => c !== "EUR"))]
}

// 1 base = ? target, from one day's euro rates. null if a leg is missing.
export function crossRate(eurRates: Record<string, number>, base: string, target: string): number | null {
  const leg = (code: string) => (code === "EUR" ? 1 : eurRates[code])
  const b = leg(base)
  const t = leg(target)
  if (typeof b !== "number" || typeof t !== "number" || !(b > 0) || !(t > 0)) return null
  return t / b
}

export function crossRates(eurRates: Record<string, number>, base: string, targets: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const target of targets) {
    if (target === base) continue
    const r = crossRate(eurRates, base, target)
    if (r !== null) out[target] = r
  }
  return out
}

// Same for a time series ({ date: { code: eurRate } }). Days missing a leg are dropped.
export function crossSeries(
  eurSeries: Record<string, Record<string, number>>,
  base: string,
  targets: string[]
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  for (const [date, rates] of Object.entries(eurSeries)) {
    const day = crossRates(rates, base, targets)
    if (Object.keys(day).length > 0) out[date] = day
  }
  return out
}
