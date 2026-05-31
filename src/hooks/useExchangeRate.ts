"use client"

import { useState, useEffect } from "react"
import { fetchLatestRates } from "@/lib/api"
import { cacheGet, cacheSet, cacheGetStale } from "@/lib/cache"
import type { ExchangeRate } from "@/lib/types"

interface UseExchangeRateResult {
  data: ExchangeRate | null
  loading: boolean
  error: string | null
  stale: boolean
}

export function useExchangeRate(
  base: string,
  target: string
): UseExchangeRateResult {
  const [data, setData] = useState<ExchangeRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    if (!base || !target || base === target) {
      setLoading(false)
      return
    }

    const cacheKey = `${base}_${target}_latest`
    const TTL = 60 * 60 * 1000

    const cached = cacheGet<ExchangeRate>(cacheKey)
    if (cached) {
      setData(cached)
      setLoading(false)
      setStale(false)
      return
    }

    setLoading(true)
    setError(null)

    fetchLatestRates(base, [target])
      .then((result) => {
        setData(result)
        setStale(false)
        cacheSet(cacheKey, result, TTL)
      })
      .catch((err) => {
        const staleData = cacheGetStale<ExchangeRate>(cacheKey)
        if (staleData) {
          setData(staleData)
          setStale(true)
        } else {
          setError(err.message)
        }
      })
      .finally(() => setLoading(false))
  }, [base, target])

  return { data, loading, error, stale }
}
