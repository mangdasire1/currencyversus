"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getLatestRate, latestCacheKey } from "@/lib/api"
import { cacheGet, cacheGetStale, onCacheUpdated, FRESH_TTL } from "@/lib/cache"
import { isExchangeRateFor } from "@/lib/cache-schemas"
import { startAutoRefresh, documentVisibility } from "@/lib/refresh"
import type { AutoRefresh } from "@/lib/refresh"
import { isMetal } from "@/lib/metals"
import type { ExchangeRate } from "@/lib/types"

interface UseExchangeRateResult {
  data: ExchangeRate | null // null unless it belongs to the current base/target
  loading: boolean // true only while there is no rate to show yet
  refreshing: boolean // a request is in flight while a rate is shown
  error: string | null
  stale: boolean
  staleAgeMs: number | null // age of the cached fallback, when known
  refresh: () => void // manual "check now" — bypasses a fresh cache
}

function isForPair(data: ExchangeRate | null, base: string, target: string): data is ExchangeRate {
  return data !== null && data.base === base && typeof data.rates?.[target] === "number"
}

// initialData: pass a pre-built ExchangeRate for SSR hydration (pair pages).
// When provided, the component renders with real data immediately (no skeleton)
// and the effect revalidates silently in the background.
//
// The rate is kept current: re-checked when it passes its fresh TTL (1 hour)
// while the tab is visible, and on return to the tab.
export function useExchangeRate(
  base: string,
  target: string,
  initialData?: ExchangeRate | null
): UseExchangeRateResult {
  const [data, setData] = useState<ExchangeRate | null>(initialData ?? null)
  const [loading, setLoading] = useState(initialData == null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [staleAgeMs, setStaleAgeMs] = useState<number | null>(null)

  const requestId = useRef(0) // only the latest request may write state
  const fetchedAtRef = useRef<string | null>(null)
  const autoRef = useRef<AutoRefresh | null>(null)

  const applicable = !!base && !!target && base !== target && !isMetal(base) && !isMetal(target)

  const apply = useCallback((rate: ExchangeRate) => {
    fetchedAtRef.current = rate.fetchedAt ?? null
    setData(rate)
    setStale(false)
    setStaleAgeMs(null)
    setError(null)
  }, [])

  const load = useCallback(
    async (force: boolean) => {
      const id = ++requestId.current
      setRefreshing(true)
      setError(null) // a retry with nothing shown goes back to "loading"
      try {
        const r = await getLatestRate(base, target, { force })
        if (id === requestId.current) apply(r)
      } catch (err) {
        if (id !== requestId.current) return
        const staleHit = cacheGetStale(latestCacheKey(base, target), isExchangeRateFor(base, target))
        if (staleHit) {
          fetchedAtRef.current = staleHit.data.fetchedAt ?? null
          setData(staleHit.data)
          setStale(true)
          setStaleAgeMs(staleHit.ageMs)
        } else {
          // Keep whatever this pair already shows (e.g. build-time data) and
          // mark it stale; with nothing to show, surface the error.
          setStale(true)
          setStaleAgeMs(null)
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (id === requestId.current) {
          setRefreshing(false)
          setLoading(false)
        }
      }
    },
    [base, target, apply]
  )

  useEffect(() => {
    if (!applicable) {
      // Not an FX pair (identity or metal). Drop whatever the previous pair
      // left behind instead of keeping it on screen.
      requestId.current++
      fetchedAtRef.current = null
      setData(null)
      setStale(false)
      setError(null)
      setLoading(false)
      setRefreshing(false)
      return
    }

    setError(null)
    setStale(false)
    void load(false)

    const auto = startAutoRefresh({
      freshTtlMs: FRESH_TTL.latest,
      getFetchedAt: () => (fetchedAtRef.current ? Date.parse(fetchedAtRef.current) : null),
      refresh: ({ force }) => load(force),
      visibility: documentVisibility(),
    })
    autoRef.current = auto

    // Another surface refreshed the same pair: show it here too.
    const key = latestCacheKey(base, target)
    const unsubscribe = onCacheUpdated(key, () => {
      const fresh = cacheGet(key, isExchangeRateFor(base, target))
      if (fresh && fresh.fetchedAt !== fetchedAtRef.current) {
        apply(fresh)
        auto.reschedule()
      }
    })

    return () => {
      requestId.current++ // drop late responses for the previous pair
      auto.stop()
      autoRef.current = null
      unsubscribe()
      setRefreshing(false)
    }
  }, [base, target, applicable, load, apply]) // initialData intentionally excluded: used only as useState seed

  const refresh = useCallback(() => {
    if (autoRef.current) void autoRef.current.refreshNow()
  }, [])

  // Pair identity check: data fetched for a previous pair is never returned.
  const matching = applicable && isForPair(data, base, target) ? data : null
  return {
    data: matching,
    loading: applicable && matching === null && (loading || error === null),
    refreshing: matching !== null && refreshing,
    error: applicable && matching === null ? error : null,
    stale: matching !== null && stale,
    staleAgeMs: matching !== null && stale ? staleAgeMs : null,
    refresh,
  }
}
