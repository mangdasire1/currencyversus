import type { ExchangeRate } from "./types"
import { CURRENCIES } from "./currencies"
import { METAL_API_BASE } from "./metals"
import type { MetalCode } from "./metals"
import { parseGoldApiPrice } from "./gold-api"

const BASE_URL = "https://api.frankfurter.dev/v1"
const ALL_CODES = CURRENCIES.map((c) => c.code)
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 2000

export interface BuildMetalPrice {
  price: number // USD per troy oz
  priceTime: string | null // provider's updatedAt; null if not supplied
  fetchedAt: string // when the build queried the provider
}

// Module-level memo so each metal is fetched at most once per build.
const metalPriceMemo = new Map<MetalCode, BuildMetalPrice>()

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { cache: "force-cache" })
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
      const result: BuildMetalPrice = { ...parsed, fetchedAt: new Date().toISOString() }
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
// force-cache deduplicates identical URLs across Next.js build workers.
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
