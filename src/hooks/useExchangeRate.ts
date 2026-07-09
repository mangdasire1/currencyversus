"use client"

import { useState, useEffect, useRef } from "react"
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
  target: string,
  initialData?: { rate: number; date: string } | null
): UseExchangeRateResult {
  const [data, setData] = useState<ExchangeRate | null>(() =>
    initialData
      ? { base, date: initialData.date, rates: { [target]: initialData.rate } }
      : null
  )
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  // On first mount with SSR data, revalidate silently without showing loading spinner.
  const ssrHydrated = useRef(!!initialData)

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
      ssrHydrated.current = false
      return
    }

    const silent = ssrHydrated.current
    ssrHydrated.current = false

    if (!silent) {
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
        } else if (!silent) {
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
  }, [base, target])

  return { data, loading, error, stale }
}
