import type { ExchangeRate, TimeSeriesRates } from "./types"
import { METAL_API_BASE } from "./metals"
import type { MetalCode } from "./metals"
import { cacheGet, cacheSet } from "./cache"

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
  symbols: string[]
): Promise<ExchangeRate> {
  const params = new URLSearchParams({ base, symbols: symbols.join(",") })
  const res = await fetch(`${BASE_URL}/${date}?${params}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchTimeSeries(
  startDate: string,
  endDate: string,
  base: string,
  symbols: string[]
): Promise<TimeSeriesRates> {
  const params = new URLSearchParams({ base, symbols: symbols.join(",") })
  const res = await fetch(`${BASE_URL}/${startDate}..${endDate}?${params}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export interface MetalPrice {
  metal: MetalCode
  price: number // USD per troy oz
  date: string
}

export async function fetchMetalPrice(metal: MetalCode): Promise<MetalPrice> {
  const cacheKey = `cv_metal_${metal}`
  const cached = cacheGet<MetalPrice>(cacheKey)
  if (cached) return cached

  const res = await fetch(`${METAL_API_BASE}/price/${metal}`)
  if (!res.ok) throw new Error(`gold-api error: ${res.status}`)
  const data = (await res.json()) as { price?: number; timestamp?: number }
  if (typeof data.price !== "number") throw new Error("gold-api: price missing")

  const date = data.timestamp
    ? new Date(data.timestamp * 1000).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]

  const result: MetalPrice = { metal, price: data.price, date }
  cacheSet(cacheKey, result, METAL_TTL)
  return result
}
