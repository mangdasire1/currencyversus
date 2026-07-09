import type { ExchangeRate } from "./types"
import { CURRENCIES } from "./currencies"

const BASE_URL = "https://api.frankfurter.dev/v1"
const ALL_CODES = CURRENCIES.map((c) => c.code)
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 2000

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
