// Amount input on Turkish pages (task C3-3). Pure — tested in amount-tr.test.ts.
//
// The English policy (amount.ts) mirrored for Turkish writing:
// - "," is the decimal separator: "1,5" = 1.5.
// - "." is accepted only as a thousands separator in a well-formed group
//   pattern ("1.000", "12.345,67"). Any other dot ("1.5") is rejected with a
//   hint, because guessing whether it meant 1,5 or 15 could silently produce a
//   wrong result — the same reasoning as the English page's comma rule.
// - Everything else (empty, negative, too large) is decided by parseAmount, so
//   both languages accept exactly the same values.

import { parseAmount, MAX_AMOUNT } from "./amount.ts"
import type { AmountParse } from "./amount.ts"
import { trNumber } from "./format-tr.ts"

export type TrAmountParse = { ok: true; value: number; canonical: string } | { ok: false; reason: Exclude<AmountParse, { ok: true }>["reason"] | "dot" }

const PLAIN = /^[+-]?(\d+,?\d*|,\d+)$/
const GROUPED = /^[+-]?\d{1,3}(\.\d{3})+(,\d*)?$/

// canonical: the same amount written the English way ("1000.5"), for
// parseAmount, the converters and the share link.
export function trParseAmount(raw: string): TrAmountParse {
  const s = raw.trim()
  let canonical: string
  if (s === "") canonical = s
  else if (PLAIN.test(s)) canonical = s.replace(",", ".")
  else if (GROUPED.test(s)) canonical = s.replace(/\./g, "").replace(",", ".")
  else return { ok: false, reason: s.includes(".") && !s.includes(",") && /^[+-]?[\d.]+$/.test(s) ? "dot" : "invalid" }
  if (canonical.endsWith(".")) canonical = canonical.slice(0, -1)
  const p = parseAmount(canonical)
  return p.ok ? { ok: true, value: p.value, canonical } : { ok: false, reason: p.reason }
}

export function trAmountErrorMessage(reason: Exclude<TrAmountParse, { ok: true }>["reason"]): string | null {
  switch (reason) {
    case "empty":
      return null // nothing to convert yet
    case "negative":
      return "Pozitif bir tutar girin."
    case "dot":
      return "Ondalık için virgül (,) kullanın, ör. 1,5"
    case "comma":
      return "Bir sayı girin, ör. 100 veya 1,5"
    case "too-large":
      return `Tutar çok büyük (en fazla ${trNumber(MAX_AMOUNT.toLocaleString("en-US"))}).`
    case "invalid":
      return "Bir sayı girin, ör. 100 veya 1,5"
  }
}

// An amount carried in English form (share link, defaults) as the Turkish
// input shows it: "1000.5" → "1000,5". Not grouped, like a typed value.
export function trAmountInput(canonical: string): string {
  return canonical.replace(".", ",")
}
