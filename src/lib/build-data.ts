import type { ExchangeRate, TimeSeriesRates, TimePeriod } from "./types"
import { CURRENCIES, TIME_PERIODS } from "./currencies"
import { derivePeriodHistory, seriesForTarget, seriesRange } from "./history"
import type { PeriodHistory } from "./history"
import { METAL_API_BASE } from "./metals"
import type { MetalCode } from "./metals"
import { parseGoldApiPrice } from "./gold-api"

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

// Fetches all rates for a given base in one request.
// The data cache (see fetchWithRetry) deduplicates identical URLs across build workers.
export async function getInitialRateData(
  base: string,
  target: string
): Promise<{ rate: number; date: string } | null> {
  const symbols = ALL_CODES.filter((c) => c !== base).join(",")
  const url = `${BASE_URL}/latest?base=${base}&symbols=${symbols}`
  try {
    const res = await fetchWithRetry(url)
    const data = (await res.json()) as ExchangeRate
    const rate = data.rates?.[target]
    if (typeof rate === "number") {
      console.log("[build-data] OK", base)
      return { rate, date: data.date }
    }
    console.warn("[build-data] FAILED", base, "rate not found in response")
    return null
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.warn("[build-data] FAILED", base, detail)
    return null
  }
}

// ---------------------------------------------------------------------------
// Historical comparison data for the server HTML.
//
// One long daily series per *base* currency (all 14 other currencies in a
// single request) feeds every pair with that base: 15 requests for 210 pair
// pages. ~0.5 MB per base, under the 2 MB per-entry limit of Next's data
// cache, so build workers share it. Periods, "Then" business days, daily
// low/high and the sampled trend line are derived with the same functions
// the client uses (src/lib/history.ts).

const seriesMemo = new Map<string, Promise<Record<string, Record<string, number>> | null>>()

function baseSeries(base: string, today: Date): Promise<Record<string, Record<string, number>> | null> {
  const { start, end } = seriesRange(today, TIME_PERIODS)
  const key = `${base}_${start}_${end}`
  let p = seriesMemo.get(key)
  if (!p) {
    const symbols = ALL_CODES.filter((c) => c !== base).join(",")
    const url = `${BASE_URL}/${start}..${end}?base=${base}&symbols=${symbols}`
    p = fetchWithRetry(url)
      .then(async (res) => {
        const data = (await res.json()) as TimeSeriesRates
        if (data.base !== base || !data.rates) throw new Error("time series does not match the requested base")
        console.log("[build-data] history OK", base, Object.keys(data.rates).length, "days")
        return data.rates
      })
      .catch((err) => {
        const detail = err instanceof Error ? err.message : String(err)
        console.warn("[build-data] history FAILED", base, detail)
        return null
      })
    seriesMemo.set(key, p)
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
