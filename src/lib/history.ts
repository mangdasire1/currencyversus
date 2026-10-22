// Sparkline sampling. Pure — tested with `node --test`.
//
// Each period draws its own full range; only the sampling frequency changes
// with the range length so long periods stay light.

import type { HistoricalPoint } from "./types.ts"
import { subtractMonths, toISODate } from "./utils.ts"

export type SampleFrequency = "daily" | "weekly" | "monthly"

export function sampleFrequencyFor(months: number): SampleFrequency {
  if (months <= 1) return "daily"
  if (months <= 12) return "weekly"
  return "monthly"
}

// Monday of the ISO week, as YYYY-MM-DD (UTC).
function weekKey(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

function bucketKey(isoDate: string, freq: SampleFrequency): string {
  if (freq === "daily") return isoDate
  if (freq === "weekly") return weekKey(isoDate)
  return isoDate.slice(0, 7) // YYYY-MM
}

// Keeps the last observation of each calendar bucket. The first and last
// points of the input are always kept so the line spans the real range.
export function samplePoints(points: HistoricalPoint[], freq: SampleFrequency): HistoricalPoint[] {
  const sorted = points
    .filter((p) => Number.isFinite(p.rate))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length <= 2) return sorted

  const out: HistoricalPoint[] = []
  for (let i = 0; i < sorted.length; i++) {
    const next = sorted[i + 1]
    if (!next || bucketKey(next.date, freq) !== bucketKey(sorted[i].date, freq)) {
      out.push(sorted[i])
    }
  }
  if (out[0] !== sorted[0]) out.unshift(sorted[0])
  return out
}

// Direction of the drawn line itself, so its colour never contradicts its shape.
export function sparklineIsUp(points: HistoricalPoint[]): boolean {
  if (points.length < 2) return true
  return points[points.length - 1].rate >= points[0].rate
}

// ---------------------------------------------------------------------------
// One series, every period.
//
// The longest period's daily series contains every shorter period, so the
// table needs a single time-series request. "Then" is the last observation
// on or before the requested date (what the provider's date endpoint returns
// for weekends/holidays); the series starts a few days early so that point
// exists for the longest period too.

export const SERIES_LEAD_DAYS = 7

export interface PeriodSpec {
  key: string
  label: string
  months: number
}

export interface PeriodHistory<P extends PeriodSpec = PeriodSpec> {
  period: P
  requestedDate: string // today − period (UTC calendar date)
  historicalDate: string | null // business day actually used for "Then"
  historicalRate: number | null
  // Lowest / highest *daily reference rate* observed in the period (one
  // observation per business day — not intraday extremes).
  low: HistoricalPoint | null
  high: HistoricalPoint | null
  // Set when the series does not reach back to requestedDate: the first
  // available observation. The period then has no "Then" value and the UI
  // says how far the data actually goes.
  coverageStart: string | null
  sparklineData: HistoricalPoint[]
}

// Statistics (Then, Now, low, high) use every daily observation; only the
// drawn trend line is thinned (see sampleFrequencyFor).
export const STATS_OBSERVATION_FREQUENCY = "daily" as const

function extremes(points: HistoricalPoint[]): { low: HistoricalPoint | null; high: HistoricalPoint | null } {
  if (points.length === 0) return { low: null, high: null }
  let low = points[0]
  let high = points[0]
  for (const p of points) {
    if (p.rate < low.rate) low = p
    if (p.rate > high.rate) high = p
  }
  return { low, high }
}

// One pair's daily series out of a multi-symbol Frankfurter time-series
// response ({ rates: { "YYYY-MM-DD": { EUR: 0.9, TRY: 41.7, … } } }).
// Days without a value for `target` are skipped, never filled.
export function seriesForTarget(
  rates: Record<string, Record<string, number>>,
  target: string
): HistoricalPoint[] {
  const out: HistoricalPoint[] = []
  for (const [date, day] of Object.entries(rates)) {
    const rate = day?.[target]
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) out.push({ date, rate })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

function monthsBack(today: Date, months: number): string {
  return toISODate(subtractMonths(today, months))
}

export function seriesRange(today: Date, periods: Array<{ months: number }>): { start: string; end: string } {
  const longest = Math.max(...periods.map((p) => p.months))
  const start = new Date(`${monthsBack(today, longest)}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - SERIES_LEAD_DAYS)
  return { start: toISODate(start), end: toISODate(today) }
}

export function derivePeriodHistory<P extends PeriodSpec>(
  series: HistoricalPoint[],
  today: Date,
  periods: P[]
): PeriodHistory<P>[] {
  const sorted = series
    .filter((p) => Number.isFinite(p.rate) && p.rate > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  return periods.map((period) => {
    const requestedDate = monthsBack(today, period.months)
    let idx = -1
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].date <= requestedDate) {
        idx = i
        break
      }
    }
    if (idx === -1) {
      // The series does not reach back to the requested date: no "Then",
      // no change figure; low/high/trend cover only what exists.
      const { low, high } = extremes(sorted)
      return {
        period,
        requestedDate,
        historicalDate: null,
        historicalRate: null,
        low,
        high,
        coverageStart: sorted[0]?.date ?? null,
        sparklineData: samplePoints(sorted, sampleFrequencyFor(period.months)),
      }
    }
    const window = sorted.slice(idx)
    const { low, high } = extremes(window)
    return {
      period,
      requestedDate,
      historicalDate: sorted[idx].date,
      historicalRate: sorted[idx].rate,
      low,
      high,
      coverageStart: null,
      // The line starts at the "Then" observation, so it agrees with the row's change.
      sparklineData: samplePoints(window, sampleFrequencyFor(period.months)),
    }
  })
}

export type SeriesFetcher = (start: string, end: string, signal?: AbortSignal) => Promise<HistoricalPoint[]>

// Loads every period for one pair with a single series request.
export async function loadPeriodHistory<P extends PeriodSpec>(
  today: Date,
  periods: P[],
  fetchSeries: SeriesFetcher,
  signal?: AbortSignal
): Promise<PeriodHistory<P>[]> {
  const { start, end } = seriesRange(today, periods)
  const series = await fetchSeries(start, end, signal)
  return derivePeriodHistory(series, today, periods)
}

// ---------------------------------------------------------------------------
// Pilot chart (Phase 7): seven periods from one daily series.
//
// The drawn line is sampled per period (table below); low/high always come
// from the full *daily* window. The two are different things and the UI says
// so. observations === points.length, i.e. exactly what is drawn.

export type ChartSampling = "daily" | "every-2nd-business-day" | "every-3rd-business-day" | "weekly" | "monthly"

export interface ChartPeriodSpec {
  key: string // matches TIME_PERIODS keys
  short: string // tab label
  months: number
  sampling: ChartSampling
}

export const CHART_PERIODS: ChartPeriodSpec[] = [
  { key: "1m", short: "1M", months: 1, sampling: "daily" },
  { key: "3m", short: "3M", months: 3, sampling: "every-2nd-business-day" },
  { key: "6m", short: "6M", months: 6, sampling: "every-3rd-business-day" },
  { key: "1y", short: "1Y", months: 12, sampling: "weekly" },
  { key: "3y", short: "3Y", months: 36, sampling: "monthly" },
  { key: "5y", short: "5Y", months: 60, sampling: "monthly" },
  { key: "10y", short: "10Y", months: 120, sampling: "monthly" },
]

export const DEFAULT_CHART_PERIOD = "10y"

export interface ChartPeriod {
  key: string
  short: string
  months: number
  sampling: ChartSampling
  requestedStart: string // today − period (UTC calendar date)
  start: HistoricalPoint | null // last published business day on or before requestedStart
  startShifted: boolean // start.date differs from requestedStart (weekend/holiday)
  end: HistoricalPoint | null // last observation in the series
  changePct: number | null // start → end, from raw rates
  low: HistoricalPoint | null // lowest DAILY reference rate in the window
  high: HistoricalPoint | null // highest DAILY reference rate in the window
  coverageStart: string | null // set when the series does not reach requestedStart
  points: HistoricalPoint[] // sampled line (first and last observation always kept)
  observations: number // === points.length
}

// Every nth observation counted back from the last one, plus the first.
function everyNth(points: HistoricalPoint[], n: number): HistoricalPoint[] {
  if (points.length <= 2 || n <= 1) return points.slice()
  const last = points.length - 1
  const out = points.filter((_, i) => (last - i) % n === 0)
  if (out[0] !== points[0]) out.unshift(points[0])
  return out
}

export function sampleChartLine(window: HistoricalPoint[], sampling: ChartSampling): HistoricalPoint[] {
  switch (sampling) {
    case "daily":
      return window.slice()
    case "every-2nd-business-day":
      return everyNth(window, 2)
    case "every-3rd-business-day":
      return everyNth(window, 3)
    case "weekly":
      return samplePoints(window, "weekly")
    case "monthly":
      return samplePoints(window, "monthly")
  }
}

export function deriveChartPeriods(series: HistoricalPoint[], today: Date, specs: ChartPeriodSpec[] = CHART_PERIODS): ChartPeriod[] {
  const sorted = series
    .filter((p) => Number.isFinite(p.rate) && p.rate > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  const end = sorted.at(-1) ?? null

  return specs.map((spec) => {
    const requestedStart = monthsBack(today, spec.months)
    let idx = -1
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].date <= requestedStart) {
        idx = i
        break
      }
    }
    const window = idx === -1 ? sorted : sorted.slice(idx)
    const start = idx === -1 ? null : sorted[idx]
    const { low, high } = extremes(window)
    const points = sampleChartLine(window, spec.sampling)
    return {
      ...spec,
      requestedStart,
      start,
      startShifted: !!start && start.date !== requestedStart,
      end,
      changePct: start && end ? ((end.rate - start.rate) / start.rate) * 100 : null,
      low,
      high,
      coverageStart: idx === -1 ? (sorted[0]?.date ?? null) : null,
      points,
      observations: points.length,
    }
  })
}

const SAMPLING_PHRASE: Record<ChartSampling, (n: number) => string> = {
  daily: (n) => `${n} daily observations`,
  "every-2nd-business-day": (n) => `${n} observations, one every second business day`,
  "every-3rd-business-day": (n) => `${n} observations, one every third business day`,
  weekly: (n) => `${n} weekly observations`,
  monthly: (n) => `${n} monthly observations`,
}

// Derived from the period's own data — never written by hand.
export function observationSentence(p: Pick<ChartPeriod, "sampling" | "observations">): string {
  return `The line uses ${SAMPLING_PHRASE[p.sampling](p.observations)}. Low and high are the extreme daily reference rates in the period, not intraday levels.`
}
