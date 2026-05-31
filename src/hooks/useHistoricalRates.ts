"use client"

import { useState, useEffect } from "react"
import { fetchHistoricalRate, fetchTimeSeries } from "@/lib/api"
import { cacheGet, cacheSet, cacheGetStale, getCacheTTL } from "@/lib/cache"
import { subtractMonths, toISODate } from "@/lib/utils"
import { TIME_PERIODS } from "@/lib/currencies"
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
    if (!base || !target || base === target || currentRate === null) {
      setLoading(false)
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
        const cacheKey = `${base}_${target}_${period.key}`
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

            // Fetch sparkline time series (sampled)
            const sampleMonths = Math.min(period.months, 12)
            const sampleStart = toISODate(subtractMonths(today, sampleMonths))
            const timeSeries = await fetchTimeSeries(sampleStart, endStr, base, [target])

            sparklineData = Object.entries(timeSeries.rates)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, rates]) => ({ date, rate: rates[target] }))
              .filter((_, i, arr) => {
                // Sample down to ~20 points for sparkline
                const step = Math.max(1, Math.floor(arr.length / 20))
                return i % step === 0
              })

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
