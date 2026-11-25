import type { ExchangeRate, TimeSeriesRates, TimePeriod } from "./types"
import { CURRENCIES, TIME_PERIODS } from "./currencies"
import { derivePeriodHistory, deriveChartPeriods, seriesForTarget, seriesRange } from "./history"
import type { PeriodHistory, ChartPeriod } from "./history"
import { METAL_API_BASE } from "./metals"
import type { MetalCode } from "./metals"
import { parseGoldApiPrice } from "./gold-api"
import { eurSymbols, crossRate, crossSeries } from "./ecb"
import { loadFullEuroSeries, yearlyRows } from "./yearly"
import type { DailyEuroRates, YearRow } from "./yearly"

const BASE_URL = "https://api.frankfurter.dev/v1"
const ALL_CODES = CURRENCIES.map((c) => c.code)
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 2000
const BUILD_FETCH_MAX_AGE_S = 60 * 60 // 1 hour

// No "fetched at" here on purpose: the response may come from Next's build
// fetch cache (up to BUILD_FETCH_MAX_AGE_S old), so the build cannot say when
// the provider was actually queried. priceTime is the provider's own time.
export interface BuildMetalPrice {
  price: number // USD per troy oz
  priceTime: string | null // provider's updatedAt; null if not supplied
}

// Module-level memo so each metal is fetched at most once per build.
const metalPriceMemo = new Map<MetalCode, BuildMetalPrice>()

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      // Next's data cache deduplicates identical URLs across build workers.
      // Its bounded lifetime limits the *build input age*: a persisted
      // .next/cache cannot feed this build data fetched more than an hour ago.
      // It says nothing about the *published HTML age* — a static export stays
      // as built until the next successful build + deploy (see
      // src/lib/freshness.ts and the production monitor workflow).
      // `cache: "no-store"` is not usable here: with output: "export" it makes
      // every fetch fail with `dynamic = "error"`.
      const res = await fetch(url, { next: { revalidate: BUILD_FETCH_MAX_AGE_S } })
      if (res.ok) return res
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
    }
    if (attempt < RETRY_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
  throw lastError
}

// Fetches current metal price in USD/oz from gold-api.com.
// Module-level memo prevents duplicate fetches during the same build.
export async function getBuildTimeMetalPrice(
  metal: MetalCode
): Promise<BuildMetalPrice | null> {
  const cached = metalPriceMemo.get(metal)
  if (cached) return cached

  const url = `${METAL_API_BASE}/price/${metal}`
  try {
    const res = await fetchWithRetry(url)
    const parsed = parseGoldApiPrice(await res.json())
    if (parsed) {
      const result: BuildMetalPrice = parsed
      metalPriceMemo.set(metal, result)
      console.log("[build-data] metal OK", metal, parsed.price, "updatedAt", parsed.priceTime ?? "missing")
      return result
    }
    console.warn("[build-data] metal FAILED", metal, "price not found in response")
    return null
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.warn("[build-data] metal FAILED", metal, detail)
    return null
  }
}

// All FX data comes from the ECB's own euro rates; pairs are derived with
// src/lib/ecb.ts (the provider's per-base answers are crosses it has already
// rounded, separately for each direction — see the comment there). One
// request for the latest rates and one for the series serve every page; the
// data cache (see fetchWithRetry) deduplicates the URL across build workers.
const EUR_SYMBOLS = eurSymbols(ALL_CODES).join(",")

let latestMemo: Promise<ExchangeRate | null> | null = null

function latestEuroRates(): Promise<ExchangeRate | null> {
  latestMemo ??= fetchWithRetry(`${BASE_URL}/latest?symbols=${EUR_SYMBOLS}`)
    .then(async (res) => {
      const data = (await res.json()) as ExchangeRate
      if (data.base !== "EUR" || !data.rates) throw new Error("expected euro reference rates")
      console.log("[build-data] OK latest euro rates", data.date)
      return data
    })
    .catch((err) => {
      latestMemo = null // let the next page retry
      console.warn("[build-data] FAILED latest euro rates", err instanceof Error ? err.message : String(err))
      return null
    })
  return latestMemo
}

export async function getInitialRateData(
  base: string,
  target: string
): Promise<{ rate: number; date: string } | null> {
  const data = await latestEuroRates()
  if (!data) return null
  const rate = crossRate(data.rates, base, target)
  if (rate === null) {
    console.warn("[build-data] FAILED", base, target, "rate not found in response")
    return null
  }
  return { rate, date: data.date }
}

// ---------------------------------------------------------------------------
// Historical comparison data for the server HTML.
//
// One long daily series of the euro rates (all 14 other currencies in a
// single request) feeds every pair: 1 request for 210 pair pages. ~0.5 MB,
// under the 2 MB per-entry limit of Next's data cache, so build workers share
// it. Each base's view is derived from it in memory. Periods, "Then" business days, daily
// low/high and the sampled trend line are derived with the same functions
// the client uses (src/lib/history.ts).

type DailyRates = Record<string, Record<string, number>>

const euroSeriesMemo = new Map<string, Promise<DailyRates | null>>()
const baseSeriesMemo = new Map<string, Promise<DailyRates | null>>()

function euroSeries(start: string, end: string): Promise<DailyRates | null> {
  const key = `${start}_${end}`
  let p = euroSeriesMemo.get(key)
  if (!p) {
    p = fetchWithRetry(`${BASE_URL}/${start}..${end}?symbols=${EUR_SYMBOLS}`)
      .then(async (res) => {
        const data = (await res.json()) as TimeSeriesRates
        if (data.base !== "EUR" || !data.rates) throw new Error("expected euro reference rates")
        console.log("[build-data] history OK euro rates", Object.keys(data.rates).length, "days")
        return data.rates
      })
      .catch((err) => {
        const detail = err instanceof Error ? err.message : String(err)
        console.warn("[build-data] history FAILED", detail)
        return null
      })
    euroSeriesMemo.set(key, p)
  }
  return p
}

// { date: { target: 1 base in target } } for every other currency.
function baseSeries(base: string, today: Date): Promise<DailyRates | null> {
  const { start, end } = seriesRange(today, TIME_PERIODS)
  const key = `${base}_${start}_${end}`
  let p = baseSeriesMemo.get(key)
  if (!p) {
    p = euroSeries(start, end).then((eur) => (eur ? crossSeries(eur, base, ALL_CODES) : null))
    baseSeriesMemo.set(key, p)
  }
  return p
}

export async function getBuildTimeHistory(
  base: string,
  target: string
): Promise<PeriodHistory<TimePeriod>[] | null> {
  const today = new Date()
  const rates = await baseSeries(base, today)
  if (!rates) return null
  const series = seriesForTarget(rates, target)
  if (series.length === 0) return null
  return derivePeriodHistory(series, today, TIME_PERIODS)
}

// ---------------------------------------------------------------------------
// Yearly figures (by-year pages): the full daily ECB series since 1999, in
// fixed spans of years (src/lib/yearly.ts), requested once per build for all
// pairs. Only the computed yearly rows reach a page, never the daily series.
// A failed or malformed span throws: the build stops rather than publish
// figures from a partial series. The 10-year request above is separate.

let fullSeriesMemo: Promise<DailyEuroRates> | null = null

function fullEuroSeries(): Promise<DailyEuroRates> {
  fullSeriesMemo ??= loadFullEuroSeries(new Date(), async (range) => {
    const t0 = Date.now()
    const res = await fetchWithRetry(`${BASE_URL}/${range.start}..${range.end}?symbols=${EUR_SYMBOLS}`)
    const text = await res.text()
    console.log("[build-data] yearly series OK", `${range.start}..${range.end}`, `${(text.length / 1024).toFixed(0)} KB`, `${Date.now() - t0} ms`)
    return text
  }).catch((err) => {
    fullSeriesMemo = null
    throw err
  })
  return fullSeriesMemo
}

export async function getBuildTimeYearly(base: string, target: string): Promise<YearRow[]> {
  const rows = yearlyRows(await fullEuroSeries(), base, target, new Date())
  if (rows.length === 0) throw new Error(`[build-data] yearly: no ECB rates for ${base}/${target}`)
  return rows
}

// New-layout pages (Phase 7): the seven chart periods, from the same
// daily series as the table above (no extra request). Only the sampled lines
// and per-period summaries are embedded, never the ~2,600-day daily series.
export async function getBuildTimeChart(base: string, target: string): Promise<ChartPeriod[] | null> {
  const today = new Date()
  const rates = await baseSeries(base, today)
  if (!rates) return null
  const series = seriesForTarget(rates, target)
  if (series.length === 0) return null
  return deriveChartPeriods(series, today)
}
