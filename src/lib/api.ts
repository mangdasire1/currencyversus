// .ts extensions: this module is imported directly by node --test (refresh tests).
import type { ExchangeRate, TimeSeriesRates } from "./types.ts"
import { METAL_API_BASE } from "./metals.ts"
import type { MetalCode } from "./metals.ts"
import { cacheGet, cacheSet, FRESH_TTL } from "./cache.ts"
import { isExchangeRateFor, isMetalPriceFor } from "./cache-schemas.ts"
import { parseGoldApiPrice } from "./gold-api.ts"
import { sharedRequest } from "./inflight.ts"

const BASE_URL = "https://api.frankfurter.dev/v1"

export async function fetchLatestRates(
  base: string,
  symbols: string[]
): Promise<ExchangeRate> {
  const params = new URLSearchParams({ base, symbols: symbols.join(",") })
  const res = await fetch(`${BASE_URL}/latest?${params}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export function latestCacheKey(base: string, target: string): string {
  return `${base}_${target}_latest`
}

// Latest FX rate for one pair. A fresh cache entry is returned without a
// request unless `force` is set (manual "check now").
export async function getLatestRate(
  base: string,
  target: string,
  { force = false }: { force?: boolean } = {}
): Promise<ExchangeRate> {
  const cacheKey = latestCacheKey(base, target)
  if (!force) {
    const cached = cacheGet(cacheKey, isExchangeRateFor(base, target))
    if (cached) return cached
  }
  // Identical concurrent requests (e.g. converter + Quick Stats on the same
  // pair refreshing together) share one provider call.
  const result = await sharedRequest(`latest_${base}_${target}`, () => fetchLatestRates(base, [target]))
  const withMeta: ExchangeRate = { ...result, fetchedAt: new Date().toISOString() }
  cacheSet(cacheKey, withMeta, FRESH_TTL.latest, "fx")
  return withMeta
}

export async function fetchTimeSeries(
  startDate: string,
  endDate: string,
  base: string,
  symbols: string[],
  signal?: AbortSignal
): Promise<TimeSeriesRates> {
  const params = new URLSearchParams({ base, symbols: symbols.join(",") })
  const res = await fetch(`${BASE_URL}/${startDate}..${endDate}?${params}`, { signal })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export interface MetalPrice {
  metal: MetalCode
  price: number // USD per troy oz
  priceTime: string | null // provider's updatedAt (ISO, with time); null if not supplied
  fetchedAt: string // when we queried the provider (ISO)
}

// cacheGet/cacheSet add the cv_ prefix. v2: shape changed from { date } to
// { priceTime, fetchedAt }.
export function metalCacheKey(metal: MetalCode): string {
  return `metal_v2_${metal}`
}

// A fresh cache entry is returned without a request unless `force` is set.
export async function fetchMetalPrice(
  metal: MetalCode,
  { force = false }: { force?: boolean } = {}
): Promise<MetalPrice> {
  const cacheKey = metalCacheKey(metal)
  if (!force) {
    const cached = cacheGet(cacheKey, isMetalPriceFor(metal))
    if (cached) return cached as MetalPrice // validator checked metal === requested metal
  }

  const parsed = await sharedRequest(`metal_${metal}`, async () => {
    const res = await fetch(`${METAL_API_BASE}/price/${metal}`)
    if (!res.ok) throw new Error(`gold-api error: ${res.status}`)
    return parseGoldApiPrice(await res.json())
  })
  if (!parsed) throw new Error("gold-api: price missing")

  const result: MetalPrice = {
    metal,
    price: parsed.price,
    priceTime: parsed.priceTime,
    fetchedAt: new Date().toISOString(),
  }
  cacheSet(cacheKey, result, FRESH_TTL.metal, "metal")
  return result
}
