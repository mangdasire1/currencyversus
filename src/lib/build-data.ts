import type { ExchangeRate } from "./types"
import { CURRENCIES } from "./currencies"

const BASE_URL = "https://api.frankfurter.dev/v1"
const ALL_CODES = CURRENCIES.map((c) => c.code)

// Fetch all rates for a given base in one request.
// force-cache deduplicates identical URLs across Next.js build workers.
export async function getInitialRateData(
  base: string,
  target: string
): Promise<{ rate: number; date: string } | null> {
  try {
    const symbols = ALL_CODES.filter((c) => c !== base).join(",")
    const res = await fetch(
      `${BASE_URL}/latest?base=${base}&symbols=${symbols}`,
      { cache: "force-cache" }
    )
    if (!res.ok) return null
    const data = (await res.json()) as ExchangeRate
    const rate = data.rates?.[target]
    return typeof rate === "number" ? { rate, date: data.date } : null
  } catch {
    return null
  }
}
