import { fetchTimeSeries } from "./api"
import { sharedRequest } from "./inflight"
import type { HistoricalPoint } from "./types"

// One pair's daily ECB series between two dates, as { date, rate } points.
// Identical concurrent requests (the home page's table and chart for the same
// pair) share one fetch.
export function fetchPairSeries(
  base: string,
  target: string,
  start: string,
  end: string,
  signal?: AbortSignal
): Promise<HistoricalPoint[]> {
  return sharedRequest(
    `series_${base}_${target}_${start}_${end}`,
    async (s) => {
      const ts = await fetchTimeSeries(start, end, base, [target], s)
      if (ts.base !== base) throw new Error("time series does not match the requested pair")
      return Object.entries(ts.rates).map(([date, rates]) => ({ date, rate: rates[target] }))
    },
    signal
  )
}
