// The share link of a pair page (package B4). Pure — tested in
// share-state.test.ts.
//
// What it carries, in the query string of the pair page's own address:
//   amount  the two-dates tool's amount          (default 100)
//   period  the chart period                     (default 10y)
//   from    the two-dates tool's first date      (default: ten years ago)
//   to      its second date                      (default: today — absent)
// Defaults are left out, so an unchanged page keeps its plain address.
//
// - The static HTML never depends on it: the page renders its defaults and
//   applies the address after hydration. The canonical stays the plain page
//   address; the sitemap lists only plain addresses.
// - The query string, not the fragment: Cloudflare Web Analytics (the only
//   analytics on the site) states "Cloudflare Web Analytics do not log query
//   strings to avoid collecting potentially sensitive data" (FAQ, read
//   2026-11-21); its docs say nothing about fragments. The page itself sends
//   the amount nowhere.
// - Anything invalid is ignored, never guessed: a bad amount, an unknown
//   period, a date outside 1999-01-04 … today.

import { parseAmount } from "./amount.ts"

export const SHARE_DEFAULT_AMOUNT = "100"
export const EARLIEST_RATE_DATE = "1999-01-04"
const ISO = /^\d{4}-\d{2}-\d{2}$/

export interface ShareState {
  amount: string
  period: string
  from: string
  to: string | null // null = today
}

export interface ShareDefaults {
  period: string
  from: string
  periods: readonly string[] // valid period keys
  today: string // YYYY-MM-DD
}

// A real calendar day: JavaScript would silently turn 2026-02-30 into 2026-03-02.
const isCalendarDay = (d: string) => {
  const t = Date.parse(`${d}T00:00:00Z`)
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d
}
const validDate = (d: string, today: string) => ISO.test(d) && isCalendarDay(d) && d >= EARLIEST_RATE_DATE && d <= today

// Reads what the address asks for. Returns only the valid fields; `found`
// says whether the address carried any share field at all, `ignored` which
// of them were not valid.
export function readShareState(search: string, d: ShareDefaults): { state: ShareState; found: boolean; ignored: string[] } {
  const q = new URLSearchParams(search)
  const state: ShareState = { amount: SHARE_DEFAULT_AMOUNT, period: d.period, from: d.from, to: null }
  const ignored: string[] = []
  let found = false
  const amount = q.get("amount")
  if (amount !== null) {
    found = true
    const p = parseAmount(amount)
    if (p.ok) state.amount = amount
    else ignored.push("amount")
  }
  const period = q.get("period")
  if (period !== null) {
    found = true
    if (d.periods.includes(period)) state.period = period
    else ignored.push("period")
  }
  const from = q.get("from")
  if (from !== null) {
    found = true
    if (validDate(from, d.today)) state.from = from
    else ignored.push("from")
  }
  const to = q.get("to")
  if (to !== null) {
    found = true
    if (validDate(to, d.today)) state.to = to === d.today ? null : to
    else ignored.push("to")
  }
  return { state, found, ignored }
}

// The query string for a state ("" when everything is at its default).
export function shareQuery(s: ShareState, d: Pick<ShareDefaults, "period" | "from">): string {
  const q = new URLSearchParams()
  if (s.amount !== SHARE_DEFAULT_AMOUNT) q.set("amount", s.amount)
  if (s.period !== d.period) q.set("period", s.period)
  if (s.from !== d.from) q.set("from", s.from)
  if (s.to !== null) q.set("to", s.to)
  const text = q.toString()
  return text ? `?${text}` : ""
}

// What a page opened from a shared link says about its numbers: whether the
// second value is recalculated with today's rate or both dates are fixed, and
// whether any part of the link was ignored. Only what was applied is claimed.
export function sharedLinkNote(s: ShareState, ignored: readonly string[], present: number): string {
  if (present > 0 && ignored.length === present) return "This link's settings were not valid, so the page shows its defaults."
  const base =
    s.to === null
      ? "Opened from a shared link. The second value uses today's ECB reference rate, so it can differ from what the sender saw."
      : "Opened from a shared link: both dates are fixed, so both values are the ECB reference rates of those days and do not change."
  return ignored.length ? `${base} Parts of the link that were not valid were ignored (${ignored.join(", ")}).` : base
}

// Number of share fields an address carries (valid or not).
export function shareFieldCount(search: string): number {
  const q = new URLSearchParams(search)
  return ["amount", "period", "from", "to"].filter((k) => q.has(k)).length
}
