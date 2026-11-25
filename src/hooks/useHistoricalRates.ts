"use client"

import { useState, useEffect, useRef } from "react"
import { cacheSet, cacheGetStale, FRESH_TTL } from "@/lib/cache"
import { isCachedHistory } from "@/lib/cache-schemas"
import type { CachedHistoryRow } from "@/lib/cache-schemas"
import { subtractMonths, toISODate } from "@/lib/utils"
import { TIME_PERIODS } from "@/lib/currencies"
import { loadPeriodHistory } from "@/lib/history"
import type { PeriodHistory } from "@/lib/history"
import { fetchPairSeries, historyCacheKey } from "@/lib/pair-series"
import { startAutoRefresh, documentVisibility } from "@/lib/refresh"
import { acceptCached, retryAt } from "@/lib/backoff"
import { newest, historyTime } from "@/lib/newer"
import type { HistoricalComparison, TimePeriod } from "@/lib/types"

interface UseHistoricalRatesResult {
  comparisons: HistoricalComparison[]
  loading: boolean
  error: string | null
  // the rows on screen are saved ones: the last check for newer ones failed
  stale: boolean
  staleAgeMs: number | null // age of the saved rows, when they are what is shown
}

// Rows are tagged with the pair they were fetched for; rows for any other
// pair are never returned.
interface HistoryState {
  pairKey: string
  rows: PeriodHistory<TimePeriod>[]
  error: string | null
  stale: boolean
  staleAgeMs: number | null
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

function emptyRows(today: Date): PeriodHistory<TimePeriod>[] {
  return TIME_PERIODS.map((period) => ({
    period,
    requestedDate: toISODate(subtractMonths(today, period.months)),
    historicalDate: null,
    historicalRate: null,
    low: null,
    high: null,
    coverageStart: null,
    sparklineData: [],
  }))
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
// refreshed in the background like the current rate, by the same scheduler:
// every 12 h while the tab is visible, nothing while it is hidden, and after a
// failed request the growing wait of src/lib/backoff.ts. Saved rows replace
// the build's only when they are not older (src/lib/newer.ts); when a check
// fails, the rows on screen are marked as saved (the tables say so).
export function useHistoricalRates(
  base: string,
  target: string,
  currentRate: number | null,
  initialRows?: PeriodHistory<TimePeriod>[] | null
): UseHistoricalRatesResult {
  const pairKey = `${base}_${target}`
  const [state, setState] = useState<HistoryState | null>(
    initialRows && initialRows.length > 0 ? { pairKey, rows: initialRows, error: null, stale: false, staleAgeMs: null } : null
  )

  const buildRef = useRef(initialRows)
  buildRef.current = initialRows

  useEffect(() => {
    if (!base || !target) return
    const today = new Date()

    if (base === target) {
      // Identity: 1 A = 1 A in every period, change is exactly 0.
      setState({ pairKey, rows: identityRows(today), error: null, stale: false, staleAgeMs: null })
      return
    }

    const buildRows = buildRef.current?.length ? buildRef.current : null
    const cacheKey = historyCacheKey(base, target)
    // Only the effect of the pair still selected may write state.
    let cancelled = false
    const controller = new AbortController()
    let fetchedAt: number | null = null // last successful check, for the scheduler

    // The newest of the rows, this pair's rows on screen and the build's.
    // stale: the rows come from a failed check; their age only if they are shown.
    const show = (rows: PeriodHistory<TimePeriod>[], stale: boolean, ageMs: number | null = null) =>
      setState((prev) => {
        const best = newest(rows, [prev?.pairKey === pairKey ? prev.rows : null, buildRows], historyTime)
        return { pairKey, rows: best, error: null, stale, staleAgeMs: stale && best === rows ? ageMs : null }
      })

    const saved = () => {
      const hit = cacheGetStale(cacheKey, isCachedHistory)
      const rows = hit ? fromCache(hit.data) : null
      return rows && hit ? { rows, ageMs: hit.ageMs } : null
    }

    const load = async () => {
      // A fresh entry stands in for a request (after a failure only one
      // written since, by another tab: backoff.ts).
      const kept = saved()
      if (kept && kept.ageMs < FRESH_TTL.shortHistory && acceptCached(cacheKey, new Date(Date.now() - kept.ageMs).toISOString())) {
        fetchedAt = Date.now() - kept.ageMs
        show(kept.rows, false)
        return
      }
      try {
        // One time-series request covers all periods; identical concurrent
        // requests (e.g. the home page's chart on the same pair) share one fetch.
        const rows = await loadPeriodHistory(today, TIME_PERIODS, (start, end, signal) => fetchPairSeries(base, target, start, end, signal), controller.signal)
        if (cancelled) return
        cacheSet(cacheKey, toCache(rows), FRESH_TTL.shortHistory, "history")
        fetchedAt = Date.now()
        show(rows, false)
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === "AbortError")) return
        const message = err instanceof Error ? err.message : String(err)
        const fallback = saved()
        if (fallback) {
          fetchedAt = Date.now() - fallback.ageMs
          return show(fallback.rows, true, fallback.ageMs)
        }
        setState((prev) =>
          buildRows && prev?.pairKey !== pairKey
            ? { pairKey, rows: buildRows, error: message, stale: true, staleAgeMs: null } // back on the page's own pair
            : prev?.pairKey === pairKey && prev.rows.some((r) => r.historicalRate !== null)
              ? { ...prev, error: message, stale: true } // keep the embedded/previous rows for this pair
              : { pairKey, rows: emptyRows(today), error: message, stale: false, staleAgeMs: null } // nothing to show: no rows to call saved
        )
      }
    }

    const auto = startAutoRefresh({
      freshTtlMs: FRESH_TTL.shortHistory,
      getFetchedAt: () => fetchedAt,
      retryAt: () => retryAt(cacheKey),
      refresh: () => load(),
      visibility: documentVisibility(),
    })
    void auto.check()

    return () => {
      cancelled = true
      auto.stop()
      controller.abort()
    }
  }, [base, target, pairKey])

  // initialRows always belong to the page's own pair, so they can stand in
  // until this pair's state exists (e.g. after client-side navigation).
  const mine = state?.pairKey === pairKey ? state : null
  const rows = mine ? mine.rows : initialRows && initialRows.length > 0 ? initialRows : null
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
    error: mine?.error ?? null,
    stale: mine?.stale ?? false,
    staleAgeMs: mine?.staleAgeMs ?? null,
  }
}
