// .ts extensions: this module is imported directly by node --test (refresh tests).
import type { ExchangeRate, TimeSeriesRates } from "./types.ts"
import { METAL_API_BASE } from "./metals.ts"
import type { MetalCode } from "./metals.ts"
import { cacheGet, cacheSet, FRESH_TTL } from "./cache.ts"
import { isExchangeRateFor, isMetalPriceFor } from "./cache-schemas.ts"
import { parseGoldApiPrice } from "./gold-api.ts"
import { sharedRequest } from "./inflight.ts"
import { getJson } from "./http.ts"
import { acceptCached, assertMayRequest, tracked } from "./backoff.ts"
import { eurSymbols, crossRates, crossSeries } from "./ecb.ts"

const BASE_URL = "https://api.frankfurter.dev/v1"

// Every FX request asks for the ECB's own euro rates (no `base=`) and derives
// the pair here (src/lib/ecb.ts): the provider's per-base answers are crosses
// it has already rounded, separately for each direction.
function eurParams(base: string, symbols: string[]): URLSearchParams {
  return new URLSearchParams({ symbols: eurSymbols([base, ...symbols]).join(",") })
}

function assertEuro(json: { base?: unknown }) {
  if (json.base !== "EUR") throw new Error("expected euro reference rates")
}

export async function fetchLatestRates(
  base: string,
  symbols: string[]
): Promise<ExchangeRate> {
  const json = await getJson<ExchangeRate>(`${BASE_URL}/latest?${eurParams(base, symbols)}`, "API error")
  assertEuro(json)
  return { base, date: json.date, rates: crossRates(json.rates ?? {}, base, symbols) }
}

// v2: values are now derived from the euro rates (v1 held the provider's
// rounded per-base cross).
export function latestCacheKey(base: string, target: string): string {
  return `${base}_${target}_latest_v2`
}

// Latest FX rate for one pair. A fresh cache entry is returned without a
// request unless `force` is set (manual "check now"). After a failure, requests
// without `force` wait (backoff.ts).
export async function getLatestRate(
  base: string,
  target: string,
  { force = false }: { force?: boolean } = {}
): Promise<ExchangeRate> {
  const cacheKey = latestCacheKey(base, target)
  if (!force) {
    const cached = cacheGet(cacheKey, isExchangeRateFor(base, target))
    if (cached && acceptCached(cacheKey, cached.fetchedAt)) return cached
    assertMayRequest(cacheKey)
  }
  // Identical concurrent requests (e.g. converter + Quick Stats on the same
  // pair refreshing together) share one provider call, and count as one
  // success or failure.
  return sharedRequest(`latest_${base}_${target}`, () =>
    tracked(cacheKey, async () => {
      const result = await fetchLatestRates(base, [target])
      const withMeta: ExchangeRate = { ...result, fetchedAt: new Date().toISOString() }
      // an answer without this pair's rate is a failure, not new data
      if (!isExchangeRateFor(base, target)(withMeta)) throw new Error("rate response does not match the requested pair")
      cacheSet(cacheKey, withMeta, FRESH_TTL.latest, "fx")
      return withMeta
    })
  )
}

export async function fetchTimeSeries(
  startDate: string,
  endDate: string,
  base: string,
  symbols: string[],
  signal?: AbortSignal
): Promise<TimeSeriesRates> {
  const json = await getJson<TimeSeriesRates>(`${BASE_URL}/${startDate}..${endDate}?${eurParams(base, symbols)}`, "API error", signal)
  assertEuro(json)
  return { ...json, base, rates: crossSeries(json.rates ?? {}, base, symbols) }
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
// After a failure, requests without `force` wait (backoff.ts).
export async function fetchMetalPrice(
  metal: MetalCode,
  { force = false }: { force?: boolean } = {}
): Promise<MetalPrice> {
  const cacheKey = metalCacheKey(metal)
  if (!force) {
    const cached = cacheGet(cacheKey, isMetalPriceFor(metal))
    if (cached && acceptCached(cacheKey, cached.fetchedAt)) return cached as MetalPrice // validator checked metal === requested metal
    assertMayRequest(cacheKey)
  }

  return sharedRequest(`metal_${metal}`, () =>
    tracked(cacheKey, async () => {
      const parsed = parseGoldApiPrice(await getJson<unknown>(`${METAL_API_BASE}/price/${metal}`, "gold-api error"))
      if (!parsed) throw new Error("gold-api: price missing")
      const result: MetalPrice = {
        metal,
        price: parsed.price,
        priceTime: parsed.priceTime,
        fetchedAt: new Date().toISOString(),
      }
      cacheSet(cacheKey, result, FRESH_TTL.metal, "metal")
      return result
    })
  )
}

// Rate on a given date for one pair. The provider answers with the last
// published business day on or before that date; `date` in the result is the
// day actually used (weekends and holidays move it back).
export async function fetchRateOn(
  date: string,
  base: string,
  target: string,
  signal?: AbortSignal
): Promise<{ date: string; rate: number }> {
  return sharedRequest(
    `on_${date}_${base}_${target}`,
    async (s) => {
      const json = await getJson<ExchangeRate>(`${BASE_URL}/${date}?${eurParams(base, [target])}`, "API error", s)
      const rate = json.base === "EUR" ? crossRates(json.rates ?? {}, base, [target])[target] : undefined
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0 || typeof json.date !== "string") {
        throw new Error("rate response does not match the requested pair")
      }
      return { date: json.date, rate }
    },
    signal
  )
}
