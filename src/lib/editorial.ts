// Editorial review dates for the explanatory text in currency-info.ts and
// metal-info.ts (descriptions, economy notes, factors, fun facts, local
// context). Separate from price/rate dates: prices refresh automatically,
// these texts only change when someone reviews them.
//
// null = not yet reviewed against sources. Set an ISO date (YYYY-MM-DD) only
// after the record's factual claims have actually been checked. Do not fill
// these in to make the page look current.

export const EDITORIAL_REVIEWED: Record<string, string | null> = {
  USD: null,
  EUR: null,
  GBP: null,
  JPY: null,
  CHF: null,
  CAD: null,
  AUD: null,
  TRY: null,
  CNY: null,
  INR: null,
  BRL: null,
  KRW: null,
  SEK: null,
  MXN: null,
  SGD: null,
  XAU: null,
  XAG: null,
  GOLD_SILVER_RATIO: null,
}

// For a page that shows several records: the oldest review date, or null if
// any of them is unreviewed.
export function editorialReviewDate(keys: string[]): string | null {
  const dates = keys.map((k) => EDITORIAL_REVIEWED[k] ?? null)
  if (dates.some((d) => d === null)) return null
  return (dates as string[]).sort()[0] ?? null
}

export function editorialReviewLabel(keys: string[]): string {
  const date = editorialReviewDate(keys)
  return date
    ? `Editorial content last reviewed: ${date}`
    : "Editorial content: review pending (background text has not yet been checked against sources)"
}
