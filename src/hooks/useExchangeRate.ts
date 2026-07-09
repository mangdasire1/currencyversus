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

// initialData: pass a pre-built ExchangeRate for SSR hydration (pair pages).
// When provided, the component renders with real data immediately (no skeleton)
// and the effect revalidates silently in the background.
export function useExchangeRate(
  base: string,
  target: string,
  initialData?: ExchangeRate | null
): UseExchangeRateResult {
  const [data, setData] = useState<ExchangeRate | null>(initialData ?? null)
  const [loading, setLoading] = useState(initialData == null)
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

    // No cached data — fetch fresh. If we already have initial data, revalidate
    // silently (loading stays false). Otherwise show a loading indicator.
    const hasData = initialData != null
    if (!hasData) {
      setLoading(true)
      setError(null)
    }

    let cancelled = false
    fetchLatestRates(base, [target])
      .then((result) => {
        if (cancelled) return
        setData(result)
        setStale(false)
        cacheSet(cacheKey, result, TTL)
      })
      .catch((err: Error) => {
        if (cancelled) return
        const staleData = cacheGetStale<ExchangeRate>(cacheKey)
        if (staleData) {
          setData(staleData)
          setStale(true)
        } else if (!hasData) {
          setError(err.message)
        } else {
          setStale(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [base, target]) // initialData intentionally excluded: used only as useState seed

  return { data, loading, error, stale }
}
