import type { ExchangeRate, TimeSeriesRates } from "./types"
import { METAL_API_BASE } from "./metals"
import type { MetalCode } from "./metals"
import { cacheGet, cacheSet } from "./cache"
import { parseGoldApiPrice } from "./gold-api"

const BASE_URL = "https://api.frankfurter.dev/v1"
const METAL_TTL = 15 * 60 * 1000 // 15 min — metals are more volatile than FX

export async function fetchLatestRates(
  base: string,
  symbols: string[]
): Promise<ExchangeRate> {
  const params = new URLSearchParams({ base, symbols: symbols.join(",") })
  const res = await fetch(`${BASE_URL}/latest?${params}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchHistoricalRate(
  date: string,
  base: string,
  symbols: string[],
  signal?: AbortSignal
): Promise<ExchangeRate> {
  const params = new URLSearchParams({ base, symbols: symbols.join(",") })
  const res = await fetch(`${BASE_URL}/${date}?${params}`, { signal })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
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

export async function fetchMetalPrice(metal: MetalCode): Promise<MetalPrice> {
  const cacheKey = metalCacheKey(metal)
  const cached = cacheGet<MetalPrice>(cacheKey)
  if (cached) return cached

  const res = await fetch(`${METAL_API_BASE}/price/${metal}`)
  if (!res.ok) throw new Error(`gold-api error: ${res.status}`)
  const parsed = parseGoldApiPrice(await res.json())
  if (!parsed) throw new Error("gold-api: price missing")

  const result: MetalPrice = {
    metal,
    price: parsed.price,
    priceTime: parsed.priceTime,
    fetchedAt: new Date().toISOString(),
  }
  cacheSet(cacheKey, result, METAL_TTL)
  return result
}
