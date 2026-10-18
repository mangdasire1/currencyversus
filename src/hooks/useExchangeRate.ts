"use client"

import { useState, useEffect } from "react"
import { fetchLatestRates } from "@/lib/api"
import { cacheGet, cacheSet, cacheGetStale, FRESH_TTL } from "@/lib/cache"
import { isExchangeRateFor } from "@/lib/cache-schemas"
import { isMetal } from "@/lib/metals"
import type { ExchangeRate } from "@/lib/types"

interface UseExchangeRateResult {
  data: ExchangeRate | null // null unless it belongs to the current base/target
  loading: boolean
  error: string | null
  stale: boolean
  staleAgeMs: number | null // age of the cached fallback, when known
}

function isForPair(data: ExchangeRate | null, base: string, target: string): data is ExchangeRate {
  return data !== null && data.base === base && typeof data.rates?.[target] === "number"
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
  const [staleAgeMs, setStaleAgeMs] = useState<number | null>(null)

  const applicable = !!base && !!target && base !== target && !isMetal(base) && !isMetal(target)

  useEffect(() => {
    if (!applicable) {
      // Not an FX pair (identity or metal). Drop whatever the previous pair
      // left behind instead of keeping it on screen.
      setData(null)
      setStale(false)
      setError(null)
      setLoading(false)
      return
    }

    const cacheKey = `${base}_${target}_latest`
    const validate = isExchangeRateFor(base, target)

    const cached = cacheGet(cacheKey, validate)
    if (cached) {
      setData(cached)
      setLoading(false)
      setStale(false)
      setError(null)
      return
    }

    // No cached data — fetch fresh. If we already hold data for this pair,
    // revalidate silently (loading stays false). Otherwise show a loading state.
    const hasData = isForPair(initialData ?? null, base, target)
    if (!hasData) {
      setLoading(true)
      setError(null)
      setStale(false)
    }

    let cancelled = false
    fetchLatestRates(base, [target])
      .then((result) => {
        if (cancelled) return
        const withMeta: ExchangeRate = { ...result, fetchedAt: new Date().toISOString() }
        setData(withMeta)
        setStale(false)
        setError(null)
        cacheSet(cacheKey, withMeta, FRESH_TTL.latest, "fx")
      })
      .catch((err: Error) => {
        if (cancelled) return
        const staleHit = cacheGetStale(cacheKey, validate)
        if (staleHit) {
          setData(staleHit.data)
          setStale(true)
          setStaleAgeMs(staleHit.ageMs)
        } else if (!hasData) {
          setError(err.message)
        } else {
          setStale(true)
          setStaleAgeMs(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [base, target, applicable]) // initialData intentionally excluded: used only as useState seed

  // Pair identity check: data fetched for a previous pair is never returned.
  const matching = applicable && isForPair(data, base, target) ? data : null
  return {
    data: matching,
    loading: applicable && (loading || (matching === null && error === null)),
    error: applicable ? error : null,
    stale: matching !== null && stale,
    staleAgeMs: matching !== null && stale ? staleAgeMs : null,
  }
}
