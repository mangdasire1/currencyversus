// Amount input policy (pure — tested with `node --test`).
//
// - The site is English: "." is the decimal separator.
// - "," is accepted only as a thousands separator in a well-formed group
//   pattern ("1,000", "12,345.67"). Any other comma ("1,5") is rejected with a
//   hint, because guessing whether it meant 1.5 or 15 could silently produce a
//   wrong result.
// - Exponent notation ("1e5") is accepted.
// - Negative amounts are not supported; empty input is a neutral state, not 0.
// - Values must be finite and at most MAX_AMOUNT.

export const MAX_AMOUNT = 1e15

export type AmountParse =
  | { ok: true; value: number }
  | { ok: false; reason: "empty" | "invalid" | "comma" | "negative" | "too-large" }

const PLAIN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i
const GROUPED = /^[+-]?\d{1,3}(,\d{3})+(\.\d*)?$/

export function parseAmount(raw: string): AmountParse {
  const s = raw.trim()
  if (s === "") return { ok: false, reason: "empty" }

  let normalized: string
  if (PLAIN.test(s)) normalized = s
  else if (GROUPED.test(s)) normalized = s.replace(/,/g, "")
  else return { ok: false, reason: s.includes(",") ? "comma" : "invalid" }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return { ok: false, reason: "too-large" }
  if (value < 0) return { ok: false, reason: "negative" }
  if (value > MAX_AMOUNT) return { ok: false, reason: "too-large" }
  return { ok: true, value: value === 0 ? 0 : value } // normalise -0
}

export function amountErrorMessage(reason: Exclude<AmountParse, { ok: true }>["reason"]): string | null {
  switch (reason) {
    case "empty":
      return null // neutral: nothing to convert yet
    case "negative":
      return "Enter a positive amount."
    case "comma":
      return "Use a dot (.) for decimals, e.g. 1.5"
    case "too-large":
      return "Amount is too large (max 1,000,000,000,000,000)."
    case "invalid":
      return "Enter a number, e.g. 100 or 1.5"
  }
}
