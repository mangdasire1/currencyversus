// .ts extensions: imported directly by node --test (backoff.test.ts).
import { fetchTimeSeries } from "./api.ts"
import { sharedRequest } from "./inflight.ts"
import { assertMayRequest, tracked } from "./backoff.ts"
import type { HistoricalPoint } from "./types.ts"

// The history rows' cache key, which is also the key of this request's wait
// after a failure (backoff.ts): v5, rows derived from euro rates (ecb.ts).
export function historyCacheKey(base: string, target: string): string {
  return `${base}_${target}_history_v5`
}

// One pair's daily ECB series between two dates, as { date, rate } points.
// Identical concurrent requests (the home page's table and chart for the same
// pair) share one fetch. After a failure the next request waits like every
// other automatic request (backoff.ts); an answer with no observation for the
// pair is a failure, not an empty history.
export function fetchPairSeries(
  base: string,
  target: string,
  start: string,
  end: string,
  signal?: AbortSignal
): Promise<HistoricalPoint[]> {
  const key = historyCacheKey(base, target)
  try {
    assertMayRequest(key)
  } catch (err) {
    return Promise.reject(err)
  }
  return sharedRequest(
    `series_${base}_${target}_${start}_${end}`,
    (s) =>
      tracked(key, async () => {
        const ts = await fetchTimeSeries(start, end, base, [target], s)
        if (ts.base !== base) throw new Error("time series does not match the requested pair")
        const points = Object.entries(ts.rates)
          .map(([date, rates]) => ({ date, rate: rates[target] }))
          .filter((p) => typeof p.rate === "number" && Number.isFinite(p.rate) && p.rate > 0)
        if (points.length === 0) throw new Error("time series has no observation for the pair")
        return points
      }),
    signal
  )
}
