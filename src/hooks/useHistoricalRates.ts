"use client"

import { useState, useEffect } from "react"
import { fetchHistoricalRate, fetchTimeSeries } from "@/lib/api"
import { cacheGet, cacheSet, cacheGetStale, getCacheTTL } from "@/lib/cache"
import { subtractMonths, toISODate } from "@/lib/utils"
import { TIME_PERIODS } from "@/lib/currencies"
import { samplePoints, sampleFrequencyFor } from "@/lib/history"
import type { HistoricalComparison, HistoricalPoint, TimePeriod } from "@/lib/types"

interface UseHistoricalRatesResult {
  comparisons: HistoricalComparison[]
  loading: boolean
  error: string | null
}

interface PeriodHistory {
  period: TimePeriod
  requestedDate: string // date we asked for (today − period, UTC)
  historicalDate: string | null // business day the provider actually returned
  historicalRate: number | null
  sparklineData: HistoricalPoint[]
}

interface CachedPeriod {
  historicalRate: number
  historicalDate?: string | null
  sparklineData: HistoricalPoint[]
}

// Rows are tagged with the pair they were fetched for; rows for any other
// pair are never returned.
interface HistoryState {
  pairKey: string
  rows: PeriodHistory[]
  error: string | null
}

function identityRows(today: Date): PeriodHistory[] {
  return TIME_PERIODS.map((period) => {
    const requestedDate = toISODate(subtractMonths(today, period.months))
    return {
      period,
      requestedDate,
      historicalDate: requestedDate,
      historicalRate: 1,
      sparklineData: [
        { date: requestedDate, rate: 1 },
        { date: toISODate(today), rate: 1 },
      ],
    }
  })
}

export function useHistoricalRates(
  base: string,
  target: string,
  currentRate: number | null
): UseHistoricalRatesResult {
  const pairKey = `${base}_${target}`
  const [state, setState] = useState<HistoryState | null>(null)

  useEffect(() => {
    if (!base || !target) return
    const today = new Date()

    if (base === target) {
      // Identity: 1 A = 1 A in every period, change is exactly 0.
      setState({ pairKey, rows: identityRows(today), error: null })
      return
    }

    // Only the response for the pair that is still selected may write state.
    let cancelled = false
    const controller = new AbortController()

    const fetchAll = async () => {
      const rows: PeriodHistory[] = []
      const endStr = toISODate(today)

      for (const period of TIME_PERIODS) {
        if (cancelled) return
        const requestedDate = toISODate(subtractMonths(today, period.months))
        // v2: sparklines span the full period (older entries were capped at 12 months)
        const cacheKey = `${base}_${target}_${period.key}_v2`
        const ttl = getCacheTTL(period.key)

        try {
          let entry = cacheGet<CachedPeriod>(cacheKey)
          if (!entry) {
            // Rate on the requested date; the provider answers with the
            // nearest preceding business day, which we keep separately.
            const historical = await fetchHistoricalRate(requestedDate, base, [target], controller.signal)
            // Sparkline covers the period's own range; long ranges are thinned
            // by sampling frequency (daily/weekly/monthly), endpoints kept.
            const timeSeries = await fetchTimeSeries(requestedDate, endStr, base, [target], controller.signal)
            if (historical.base !== base || typeof historical.rates[target] !== "number") {
              throw new Error("historical response does not match the requested pair")
            }
            entry = {
              historicalRate: historical.rates[target],
              historicalDate: historical.date ?? null,
              sparklineData: samplePoints(
                Object.entries(timeSeries.rates).map(([date, rates]) => ({ date, rate: rates[target] })),
                sampleFrequencyFor(period.months)
              ),
            }
            cacheSet(cacheKey, entry, ttl)
          }
          rows.push({
            period,
            requestedDate,
            historicalDate: entry.historicalDate ?? null,
            historicalRate: entry.historicalRate,
            sparklineData: entry.sparklineData,
          })
        } catch {
          if (cancelled) return
          const stale = cacheGetStale<CachedPeriod>(cacheKey)
          rows.push({
            period,
            requestedDate,
            historicalDate: stale?.historicalDate ?? null,
            historicalRate: stale?.historicalRate ?? null,
            sparklineData: stale?.sparklineData ?? [],
          })
        }
      }

      if (!cancelled) setState({ pairKey, rows, error: null })
    }

    fetchAll().catch((err: Error) => {
      if (!cancelled) setState({ pairKey, rows: [], error: err.message })
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [base, target, pairKey])

  const rows = state?.pairKey === pairKey ? state.rows : null
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
    sparklineData: r.sparklineData,
  }))

  return {
    comparisons,
    loading: rows === null,
    error: state?.pairKey === pairKey ? state.error : null,
  }
}
