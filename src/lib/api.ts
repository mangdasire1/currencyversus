import type { ExchangeRate, TimeSeriesRates } from "./types"

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
