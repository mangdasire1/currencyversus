"use client"

import { useState, useEffect } from "react"
import { fetchTimeSeries } from "@/lib/api"
import { cacheGet, cacheSet, cacheGetStale, FRESH_TTL } from "@/lib/cache"
import { isCachedHistory } from "@/lib/cache-schemas"
import type { CachedHistoryRow } from "@/lib/cache-schemas"
import { subtractMonths, toISODate } from "@/lib/utils"
import { TIME_PERIODS } from "@/lib/currencies"
import { loadPeriodHistory } from "@/lib/history"
import type { PeriodHistory } from "@/lib/history"
import { sharedRequest } from "@/lib/inflight"
import type { HistoricalComparison, TimePeriod } from "@/lib/types"

interface UseHistoricalRatesResult {
  comparisons: HistoricalComparison[]
  loading: boolean
  error: string | null
}

// Rows are tagged with the pair they were fetched for; rows for any other
// pair are never returned.
interface HistoryState {
  pairKey: string
  rows: PeriodHistory<TimePeriod>[]
  error: string | null
}

function identityRows(today: Date): PeriodHistory<TimePeriod>[] {
  return TIME_PERIODS.map((period) => {
    const requestedDate = toISODate(subtractMonths(today, period.months))
    return {
      period,
      requestedDate,
      historicalDate: requestedDate,
      historicalRate: 1,
      low: { date: requestedDate, rate: 1 },
      high: { date: requestedDate, rate: 1 },
      coverageStart: null,
      sparklineData: [
        { date: requestedDate, rate: 1 },
        { date: toISODate(today), rate: 1 },
      ],
    }
  })
}

function toCache(rows: PeriodHistory<TimePeriod>[]): CachedHistoryRow[] {
  return rows.map(({ period, ...rest }) => ({ periodKey: period.key, ...rest }))
}

function fromCache(rows: CachedHistoryRow[]): PeriodHistory<TimePeriod>[] | null {
  const out: PeriodHistory<TimePeriod>[] = []
  for (const period of TIME_PERIODS) {
    const r = rows.find((x) => x.periodKey === period.key)
    if (!r) return null // cached rows don't cover the current period set
    const { periodKey: _unused, ...rest } = r
    void _unused
    out.push({ period, ...rest })
  }
  return out
}

// initialRows: history embedded at build time (pair pages). It is rendered
// immediately — in the server HTML and on first paint, no skeleton — and
// refreshed silently in the background like the current rate.
export function useHistoricalRates(
  base: string,
  target: string,
  currentRate: number | null,
  initialRows?: PeriodHistory<TimePeriod>[] | null
): UseHistoricalRatesResult {
  const pairKey = `${base}_${target}`
  const [state, setState] = useState<HistoryState | null>(
    initialRows && initialRows.length > 0 ? { pairKey, rows: initialRows, error: null } : null
  )

  useEffect(() => {
    if (!base || !target) return
    const today = new Date()

    if (base === target) {
      // Identity: 1 A = 1 A in every period, change is exactly 0.
      setState({ pairKey, rows: identityRows(today), error: null })
      return
    }

    // v4: one entry per pair holding every period (derived from one series),
    // now with daily low/high and coverage start
    const cacheKey = `${base}_${target}_history_v4`
    const cached = cacheGet(cacheKey, isCachedHistory)
    const cachedRows = cached ? fromCache(cached) : null
    if (cachedRows) {
      setState({ pairKey, rows: cachedRows, error: null })
      return
    }

    // Only the response for the pair that is still selected may write state.
    let cancelled = false
    const controller = new AbortController()

    // One time-series request covers all periods; identical concurrent
    // requests (e.g. two components on the same pair) share one fetch.
    const fetchSeries = (start: string, end: string, signal?: AbortSignal) =>
      sharedRequest(
        `series_${base}_${target}_${start}_${end}`,
        async (s) => {
          const ts = await fetchTimeSeries(start, end, base, [target], s)
          if (ts.base !== base) throw new Error("time series does not match the requested pair")
          return Object.entries(ts.rates).map(([date, rates]) => ({ date, rate: rates[target] }))
        },
        signal
      )

    loadPeriodHistory(today, TIME_PERIODS, fetchSeries, controller.signal)
      .then((rows) => {
        if (cancelled) return
        cacheSet(cacheKey, toCache(rows), FRESH_TTL.shortHistory, "history")
        setState({ pairKey, rows, error: null })
      })
      .catch((err: Error) => {
        if (cancelled) return
        const stale = cacheGetStale(cacheKey, isCachedHistory)
        const staleRows = stale ? fromCache(stale.data) : null
        setState((prev) =>
          staleRows
            ? { pairKey, rows: staleRows, error: null }
            : prev?.pairKey === pairKey && prev.rows.length > 0
              ? { ...prev, error: err.message } // keep the embedded/previous rows for this pair
              : {
                  pairKey,
                  rows: TIME_PERIODS.map((period) => ({
                    period,
                    requestedDate: toISODate(subtractMonths(today, period.months)),
                    historicalDate: null,
                    historicalRate: null,
                    low: null,
                    high: null,
                    coverageStart: null,
                    sparklineData: [],
                  })),
                  error: err.message,
                }
        )
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [base, target, pairKey])

  // initialRows always belong to the page's own pair, so they can stand in
  // until this pair's state exists (e.g. after client-side navigation).
  const rows = state?.pairKey === pairKey ? state.rows : initialRows && initialRows.length > 0 ? initialRows : null
  const now = base === target ? 1 : currentRate

  const comparisons: HistoricalComparison[] = (rows ?? []).map((r) => ({
    period: r.period,
    requestedDate: r.requestedDate,
    historicalDate: r.historicalDate,
    historicalRate: r.historicalRate,
    currentRate: now,
    percentChange:
      base === target
        ? 0
        : now !== null && r.historicalRate !== null && r.historicalRate !== 0
          ? ((now - r.historicalRate) / r.historicalRate) * 100
          : null,
    low: r.low,
    high: r.high,
    coverageStart: r.coverageStart,
    sparklineData: r.sparklineData,
  }))

  return {
    comparisons,
    loading: rows === null,
    error: state?.pairKey === pairKey ? state.error : null,
  }
}
