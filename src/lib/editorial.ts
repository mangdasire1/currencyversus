// Editorial review dates for the explanatory text in currency-info.ts and
// metal-info.ts (descriptions, economy notes, factors, fun facts, local
// context). Separate from price/rate dates: prices refresh automatically,
// these texts only change when someone reviews them.
//
// null = not yet reviewed against sources. Set an ISO date (YYYY-MM-DD) only
// after the record's factual claims have actually been checked. Do not fill
// these in to make the page look current.

// 2026-10-22: full sweep of all records (Phases 4 and 5, see
// EDITORIAL_REVIEW_LOG); src/lib/editorial.test.ts guards the result.
export const EDITORIAL_REVIEWED: Record<string, string | null> = {
  USD: "2026-10-22",
  EUR: "2026-10-22",
  GBP: "2026-10-22",
  JPY: "2026-10-22",
  CHF: "2026-10-22",
  CAD: "2026-10-22",
  AUD: "2026-10-22",
  TRY: "2026-10-22",
  CNY: "2026-10-22",
  INR: "2026-10-22",
  BRL: "2026-10-22",
  KRW: "2026-10-22",
  SEK: "2026-10-22",
  MXN: "2026-10-22",
  SGD: "2026-10-22",
  XAU: "2026-10-22",
  XAG: "2026-10-22",
  GOLD_SILVER_RATIO: "2026-10-22",
}

// What was checked, when and by whom. EDITORIAL_REVIEWED keeps only the date
// shown on the page; this log says what that date covers. Dates are entered
// by hand when a review happens — never derived from the build date.
export interface ReviewLogEntry {
  date: string // YYYY-MM-DD
  records: string[] | "all"
  checked: string // which claims / which rule
  reviewedBy: string
}

const AI_REVIEW = "Claude Code (AI assistant) at the site owner's request — not an independent fact-check"

export const EDITORIAL_REVIEW_LOG: ReviewLogEntry[] = [
  {
    date: "2026-10-18",
    records: ["EUR"],
    checked: "eurozone member count (Bulgaria joined 2026-01-01); later removed as a volatile count",
    reviewedBy: AI_REVIEW,
  },
  {
    date: "2026-10-22",
    records: "all",
    checked: "Phase 4: figures that go stale, numeric rankings, company/fund names, tax claims, investment calls removed",
    reviewedBy: AI_REVIEW,
  },
  {
    date: "2026-10-22",
    records: "all",
    checked:
      "Phase 5: rankings and comparisons without numbers rewritten; silver-vs-gold comparisons and fixed historical dates kept and flagged as needing a SourcedClaim",
    reviewedBy: AI_REVIEW,
  },
  {
    date: "2026-10-22",
    records: ["CAD", "KRW", "SGD", "XAU", "XAG"],
    checked:
      "Phase 6 (owner's decisions): removed 6 blocks without a user question (CAD/KRW/SGD fun facts, XAU-MXN, XAG-CHF, XAG-BRL local context); silver-vs-gold comparisons replaced by the demand mechanism; fixed dates reclassified as historical constants",
    reviewedBy: AI_REVIEW,
  },
]

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
