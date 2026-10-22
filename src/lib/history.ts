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

export function seriesRange(today: Date, periods: PeriodSpec[]): { start: string; end: string } {
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
