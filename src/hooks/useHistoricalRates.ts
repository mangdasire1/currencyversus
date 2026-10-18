"use client"

import { useState, useEffect } from "react"
import { fetchHistoricalRate, fetchTimeSeries } from "@/lib/api"
import { cacheGet, cacheSet, cacheGetStale, getCacheTTL } from "@/lib/cache"
import { subtractMonths, toISODate } from "@/lib/utils"
import { TIME_PERIODS } from "@/lib/currencies"
import { samplePoints, sampleFrequencyFor } from "@/lib/history"
import type { HistoricalComparison, HistoricalPoint } from "@/lib/types"

interface UseHistoricalRatesResult {
  comparisons: HistoricalComparison[]
  loading: boolean
  error: string | null
}

export function useHistoricalRates(
  base: string,
  target: string,
  currentRate: number | null
): UseHistoricalRatesResult {
  const [comparisons, setComparisons] = useState<HistoricalComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (base && base === target) {
      // Identity: 1 A = 1 A in every period, change is exactly 0.
      const today = new Date()
      setComparisons(
        TIME_PERIODS.map((period) => ({
          period,
          historicalRate: 1,
          currentRate: 1,
          percentChange: 0,
          sparklineData: [
            { date: toISODate(subtractMonths(today, period.months)), rate: 1 },
            { date: toISODate(today), rate: 1 },
          ],
        }))
      )
      setLoading(false)
      return
    }
    if (!base || !target || currentRate === null) {
      // Never leave the previous pair's rows on screen.
      setComparisons([])
      setLoading(true)
      return
    }

    setLoading(true)
    setError(null)

    const today = new Date()

    const fetchAll = async () => {
      const results: HistoricalComparison[] = []

      for (const period of TIME_PERIODS) {
        const startDate = subtractMonths(today, period.months)
        const startStr = toISODate(startDate)
        const endStr = toISODate(today)
        // v2: sparklines now span the full period (older entries were capped at 12 months)
        const cacheKey = `${base}_${target}_${period.key}_v2`
        const ttl = getCacheTTL(period.key)

        try {
          const cached = cacheGet<{
            historicalRate: number
            sparklineData: HistoricalPoint[]
          }>(cacheKey)

          let historicalRate: number
          let sparklineData: HistoricalPoint[]

          if (cached) {
            historicalRate = cached.historicalRate
            sparklineData = cached.sparklineData
          } else {
            // Fetch historical rate at start date
            const historical = await fetchHistoricalRate(startStr, base, [target])
            historicalRate = historical.rates[target]

            // Sparkline covers the period's own range; long ranges are thinned
            // by sampling frequency (daily/weekly/monthly), endpoints kept.
            const timeSeries = await fetchTimeSeries(startStr, endStr, base, [target])
            sparklineData = samplePoints(
              Object.entries(timeSeries.rates).map(([date, rates]) => ({ date, rate: rates[target] })),
              sampleFrequencyFor(period.months)
            )

            cacheSet(cacheKey, { historicalRate, sparklineData }, ttl)
          }

          const percentChange =
            historicalRate !== 0
              ? ((currentRate - historicalRate) / historicalRate) * 100
              : null

          results.push({
            period,
            historicalRate,
            currentRate,
            percentChange,
            sparklineData,
          })
        } catch {
          const stale = cacheGetStale<{
            historicalRate: number
            sparklineData: HistoricalPoint[]
          }>(cacheKey)

          results.push({
            period,
            historicalRate: stale?.historicalRate ?? null,
            currentRate,
            percentChange: null,
            sparklineData: stale?.sparklineData ?? [],
          })
        }
      }

      setComparisons(results)
    }

    fetchAll()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [base, target, currentRate])

  return { comparisons, loading, error }
}
