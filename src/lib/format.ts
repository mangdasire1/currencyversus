// Display-only number formatting. Nothing here feeds back into calculations:
// rates, amounts and percentages are computed from raw values and rounded
// only at the moment they are turned into text.
//
// Three kinds of numbers, three policies:
//   rate / ratio  → adaptive decimals by magnitude (never shows 0.00 for a non-zero rate)
//   money amount  → the currency's own minor-unit decimals
//   metal amount  → grams ≥1: 3 decimals, <1: 4–6; ounces: at least 4

import type { MetalUnit } from "./conversion.ts"

const MAX_DECIMALS = 8

function fixed(n: number, decimals: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Decimals that keep ~3 significant digits for |n| < 1, clamped to [min, max].
function decimalsForSmall(n: number, min: number, max: number): number {
  const leadingZeros = Math.ceil(-Math.log10(Math.abs(n))) // 0.0000726 → 5
  return Math.min(max, Math.max(min, leadingZeros + 2))
}

// Below the smallest representable step: say so instead of printing zeros.
function belowStep(n: number, decimals: number): string | null {
  const step = 10 ** -decimals
  if (n !== 0 && Math.abs(n) < step / 2) {
    return `${n < 0 ? ">-" : "<"}${step.toFixed(decimals)}`
  }
  return null
}

export function rateDecimals(n: number): number {
  const a = Math.abs(n)
  if (a >= 100) return 2
  if (a >= 1) return 4
  if (a >= 0.01) return 5
  return decimalsForSmall(n, 6, MAX_DECIMALS)
}

// Exchange rates, metal prices per unit, gold/silver ratio.
export function formatRateValue(n: number): string {
  if (!Number.isFinite(n)) return "—"
  if (n === 0) return "0"
  const d = rateDecimals(n)
  return belowStep(n, d) ?? fixed(n, d)
}

// Money: the currency's own minor units (2 for most, 0 for JPY/KRW).
export function formatMoney(n: number, currencyDecimals: number): string {
  if (!Number.isFinite(n)) return "—"
  return fixed(n, currencyDecimals)
}

export function metalDecimals(n: number, unit: MetalUnit): number {
  const a = Math.abs(n)
  if (unit === "g") return a >= 1 ? 3 : decimalsForSmall(n, 4, 6)
  return a >= 1 ? 4 : decimalsForSmall(n, 4, 6)
}

export function formatMetalAmount(n: number, unit: MetalUnit): string {
  if (!Number.isFinite(n)) return "—"
  if (n === 0) return fixed(0, unit === "g" ? 3 : 4)
  const d = metalDecimals(n, unit)
  return belowStep(n, d) ?? fixed(n, d)
}

// "3 h old" style age for cached fallback data.
export function formatAge(ms: number): string {
  const min = Math.floor(ms / 60000)
  if (min < 1) return "less than a minute old"
  if (min < 60) return `${min} min old`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h} h old`
  return `${Math.floor(h / 24)} days old`
}

// Changes smaller than the displayed resolution are shown as ~0% rather than
// a figure like -0.02% that the visible rates cannot confirm.
export const PERCENT_EPSILON = 0.01

export function formatPercentChange(p: number): string {
  if (!Number.isFinite(p)) return "—"
  if (Math.abs(p) < PERCENT_EPSILON) return "~0%"
  return `${p > 0 ? "+" : ""}${p.toFixed(2)}%`
}
