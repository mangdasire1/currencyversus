// Yearly figures from the full daily ECB series. Pure — tested with
// `node --test` (src/lib/yearly.test.ts).
//
// The series is the ECB's own euro rates; a pair's daily rate is the cross of
// its two euro legs at full float precision (src/lib/ecb.ts). Every figure is
// computed from those raw crosses; rounding happens only when one is shown.

import { ECB_DECIMALS, crossRate } from "./ecb.ts"

// The ECB's first publication day (the euro's launch).
export const ECB_FIRST_DAY = "1999-01-04"
// The full series is requested in fixed spans of this many calendar years,
// counted from 1999: 1999–2008, 2009–2018, 2019–2028, … A new span is added
// on its own when its first year begins. Each span stays well under the
// 2 MB per-entry limit of Next's data cache (10 years ≈ 0.5 MB today).
export const SPAN_YEARS = 10
// A span's answer above this size is reported loudly at build time: it is
// getting close to that 2 MB limit (the cache stores the body base64-encoded,
// about 4/3 of its size), past which every build worker requests it again.
export const SPAN_WARN_BYTES = 1.5 * 1024 * 1024

// A currency whose ECB publication began after ECB_FIRST_DAY. The provider
// also returns TRY for 1999–2004: those are the ECB's old-lira (TRL) rates
// divided by 1,000,000 by the provider, not a TRY publication. The ECB's own
// TRY rate starts with the new lira, on 3 January 2005.
export const CURRENCY_FIRST_DAY: Record<string, string> = { TRY: "2005-01-03" }

export interface SpanRange {
  start: string
  end: string
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// The spans that cover ECB_FIRST_DAY … today. The last one ends today.
export function seriesSpans(today: Date, spanYears = SPAN_YEARS): SpanRange[] {
  const first = Number(ECB_FIRST_DAY.slice(0, 4))
  const end = iso(today)
  const out: SpanRange[] = []
  for (let y = first; `${y}-01-01` <= end; y += spanYears) {
    const start = y === first ? ECB_FIRST_DAY : `${y}-01-01`
    const last = `${y + spanYears - 1}-12-31`
    out.push({ start, end: last < end ? last : end })
  }
  return out
}

// null, or the warning the build prints for one span's answer.
export function spanSizeWarning(range: SpanRange, bytes: number): string | null {
  if (!(bytes > SPAN_WARN_BYTES)) return null
  const mb = (n: number) => (n / 1024 / 1024).toFixed(2)
  return `WARNING: ECB series ${range.start}..${range.end} is ${mb(bytes)} MB, over ${mb(SPAN_WARN_BYTES)} MB. ` +
    `Next's data cache refuses entries over 2 MB (stored base64, ~4/3 larger); lower SPAN_YEARS in src/lib/yearly.ts.`
}

export type DailyEuroRates = Record<string, Record<string, number>>

// All spans, requested together and merged by date. A span's answer may
// start on the business day before its start date (the provider steps back);
// such a day is the same publication as in the previous span. Throws if a
// span fails or is not the ECB's euro series: the build must not publish
// figures from a partial series.
export async function loadFullEuroSeries(
  today: Date,
  fetchText: (range: SpanRange) => Promise<string>,
  warn: (message: string) => void = console.warn
): Promise<DailyEuroRates> {
  const spans = seriesSpans(today)
  const parts = await Promise.all(spans.map(async (range) => {
    const text = await fetchText(range)
    const msg = spanSizeWarning(range, new TextEncoder().encode(text).length)
    if (msg) warn(msg)
    const json = JSON.parse(text) as { base?: unknown; rates?: unknown }
    if (json.base !== "EUR" || !json.rates || typeof json.rates !== "object") throw new Error(`ECB series ${range.start}..${range.end}: expected euro reference rates`)
    const days = Object.keys(json.rates as object)
    if (days.length === 0) throw new Error(`ECB series ${range.start}..${range.end}: no days`)
    return json.rates as DailyEuroRates
  }))
  const out: DailyEuroRates = {}
  for (const part of parts) for (const [date, rates] of Object.entries(part)) out[date] = { ...out[date], ...rates }
  return out
}

export interface DatedRate {
  date: string
  rate: number
  sig: number // significant digits the ECB legs of that day carry
}

export interface YearRow {
  year: number
  first: string // first publication day in the row
  end: DatedRate // last publication day of the year (so far, for the current year)
  average: number // arithmetic mean of the daily cross rates
  low: DatedRate
  high: DatedRate
  days: number
  changePct: number | null // end vs previous year's end; null in the first year
  current: boolean // the year is not over: figures run from 1 January to `end.date`
  partialStart: boolean // the pair's data begins after the year's first ECB publication day
  // significant digits of the average: the fewest of the year's days (a mean is
  // no more precise than its least precise term); a dated rate carries its own day's
  sig: number
}

// Significant digits of one ECB euro rate: its fixed decimals plus the
// position of its first digit (55.4846 → 6, 1.1133 → 5, 0.83785 → 5).
function legSignificant(code: string, eurRate: number): number {
  if (code === "EUR") return Infinity
  return (ECB_DECIMALS[code] ?? 4) + Math.floor(Math.log10(eurRate)) + 1
}

// One row per calendar year in which both currencies have ECB rates, oldest first.
export function yearlyRows(euro: DailyEuroRates, base: string, target: string, today: Date): YearRow[] {
  const dates = Object.keys(euro).sort()
  // the ECB's first publication day of each year, any currency
  const yearFirst = new Map<number, string>()
  for (const d of dates) {
    const y = Number(d.slice(0, 4))
    if (!yearFirst.has(y)) yearFirst.set(y, d)
  }
  const byYear = new Map<number, { date: string; rate: number; sig: number }[]>()
  const from = [CURRENCY_FIRST_DAY[base], CURRENCY_FIRST_DAY[target]].filter(Boolean).sort().at(-1) ?? ""
  for (const date of dates) {
    if (date < from) continue
    const day = euro[date]
    const rate = crossRate(day, base, target)
    if (rate === null) continue
    const sig = Math.min(legSignificant(base, day[base]), legSignificant(target, day[target]))
    const y = Number(date.slice(0, 4))
    let list = byYear.get(y)
    if (!list) byYear.set(y, (list = []))
    list.push({ date, rate, sig: Number.isFinite(sig) ? sig : 5 })
  }
  const thisYear = today.getUTCFullYear()
  const rows: YearRow[] = []
  let firstSeen = false
  for (const year of [...byYear.keys()].sort((a, b) => a - b)) {
    const days = byYear.get(year)!
    let sum = 0
    let low = days[0]
    let high = days[0]
    let sig = Infinity
    for (const d of days) {
      sum += d.rate
      if (d.rate < low.rate) low = d
      if (d.rate > high.rate) high = d
      sig = Math.min(sig, d.sig)
    }
    const last = days[days.length - 1]
    const prev = rows[rows.length - 1]
    rows.push({
      year,
      first: days[0].date,
      end: { date: last.date, rate: last.rate, sig: last.sig },
      average: sum / days.length,
      low: { date: low.date, rate: low.rate, sig: low.sig },
      high: { date: high.date, rate: high.rate, sig: high.sig },
      days: days.length,
      changePct: prev && prev.year === year - 1 ? (last.rate / prev.end.rate - 1) * 100 : null,
      current: year >= thisYear,
      partialStart: !firstSeen && days[0].date > (yearFirst.get(year) ?? days[0].date),
      sig,
    })
    firstSeen = true
  }
  return rows
}

// ---------------------------------------------------------------------------
// Year labels

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const enDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`
const trDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

// "2026 (year to 20 Nov 2026)", "2005 (from 3 Jan 2005)", "2019"
export function yearLabelEn(row: Pick<YearRow, "year" | "first" | "end" | "current" | "partialStart">): string {
  if (row.current) return `${row.year} (year to ${enDate(row.end.date)})`
  if (row.partialStart) return `${row.year} (from ${enDate(row.first)})`
  return String(row.year)
}

// The last word of a year read aloud in Turkish (2026 → "altı", 2010 → "on",
// 2000 → "bin"): the case suffix after the date follows it.
const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]
function lastWord(n: number): string {
  if (n % 10) return ONES[n % 10]
  if (n % 100) return TENS[(n % 100) / 10]
  if (n % 1000) return "yüz"
  return "bin"
}
const BACK = /[aıou]/
function lastVowel(w: string): string {
  return [...w].reverse().find((c) => /[aeıioöuü]/.test(c)) ?? "e"
}
// dative: 2026'ya, 2005'e, 2010'a, 2020'ye
export function trDative(n: number): string {
  const w = lastWord(n)
  const a = BACK.test(lastVowel(w)) ? "a" : "e"
  return /[aeıioöuü]$/.test(w) ? `y${a}` : a
}
// ablative: 2005'ten, 2026'dan, 2010'dan, 2004'ten
export function trAblative(n: number): string {
  const w = lastWord(n)
  const a = BACK.test(lastVowel(w)) ? "a" : "e"
  return `${/[çfhkpsşt]$/.test(w) ? "t" : "d"}${a}n`
}

// "2026 (yıl başından 20.11.2026'ya)", "2005 (03.01.2005'ten itibaren)", "2019"
export function yearLabelTr(row: Pick<YearRow, "year" | "first" | "end" | "current" | "partialStart">): string {
  if (row.current) return `${row.year} (yıl başından ${trDate(row.end.date)}'${trDative(Number(row.end.date.slice(0, 4)))})`
  if (row.partialStart) return `${row.year} (${trDate(row.first)}'${trAblative(Number(row.first.slice(0, 4)))} itibaren)`
  return String(row.year)
}
