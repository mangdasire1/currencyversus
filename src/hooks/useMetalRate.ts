"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { fetchMetalPrice, metalCacheKey } from "@/lib/api"
import type { MetalPrice } from "@/lib/api"
import { cacheGet, cacheGetStale, onCacheUpdated, FRESH_TTL } from "@/lib/cache"
import { isMetalPriceFor } from "@/lib/cache-schemas"
import { startAutoRefresh, documentVisibility } from "@/lib/refresh"
import type { AutoRefresh } from "@/lib/refresh"
import type { MetalCode } from "@/lib/metals"

interface UseMetalRateResult {
  price: number | null
  priceTime: string | null
  fetchedAt: string | null
  loading: boolean // true only while there is no price to show yet
  refreshing: boolean // a request is in flight while a price is shown
  stale: boolean
  staleAgeMs: number | null
  refresh: () => void // manual "check now" — bypasses a fresh cache
}

// initialPriceUsd: pass the build-time USD oz price for SSR hydration (no skeleton flicker).
// enabled: set false to skip fetching (useful when metal hook is called unconditionally
//          but the current converter pair does not involve this metal).
// initialPriceTime: the provider timestamp that belongs to initialPriceUsd.
//
// While enabled, the price is kept current: re-checked when it passes its
// fresh TTL (15 min) while the tab is visible, and on return to the tab.
export function useMetalRate(
  metal: MetalCode,
  initialPriceUsd?: number | null,
  enabled = true,
  initialPriceTime?: string | null
): UseMetalRateResult {
  const [price, setPrice] = useState<number | null>(initialPriceUsd ?? null)
  const [priceTime, setPriceTime] = useState<string | null>(initialPriceTime ?? null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled && initialPriceUsd == null)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [stale, setStale] = useState(false)
  const [staleAgeMs, setStaleAgeMs] = useState<number | null>(null)

  const requestId = useRef(0) // only the latest request may write state
  const fetchedAtRef = useRef<string | null>(null)
  const autoRef = useRef<AutoRefresh | null>(null)

  const apply = useCallback((r: MetalPrice) => {
    fetchedAtRef.current = r.fetchedAt
    setPrice(r.price)
    setPriceTime(r.priceTime)
    setFetchedAt(r.fetchedAt)
    setStale(false)
    setStaleAgeMs(null)
    setFailed(false)
  }, [])

  const load = useCallback(
    async (force: boolean) => {
      const id = ++requestId.current
      setRefreshing(true)
      setFailed(false) // a retry with nothing shown goes back to "loading"
      try {
        const r = await fetchMetalPrice(metal, { force })
        if (id === requestId.current) apply(r)
      } catch {
        if (id !== requestId.current) return
        const staleHit = cacheGetStale(metalCacheKey(metal), isMetalPriceFor(metal))
        if (staleHit) {
          fetchedAtRef.current = staleHit.data.fetchedAt
          setPrice(staleHit.data.price)
          setPriceTime(staleHit.data.priceTime)
          setFetchedAt(staleHit.data.fetchedAt)
          setStale(true)
          setStaleAgeMs(staleHit.ageMs)
        } else {
          setStale(true)
          setStaleAgeMs(null)
          setFailed(true)
        }
      } finally {
        if (id === requestId.current) {
          setRefreshing(false)
          setLoading(false)
        }
      }
    },
    [metal, apply]
  )

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    void load(false)

    const auto = startAutoRefresh({
      freshTtlMs: FRESH_TTL.metal,
      getFetchedAt: () => (fetchedAtRef.current ? Date.parse(fetchedAtRef.current) : null),
      refresh: ({ force }) => load(force),
      visibility: documentVisibility(),
    })
    autoRef.current = auto

    // Another surface refreshed the same metal: show it here too.
    const unsubscribe = onCacheUpdated(metalCacheKey(metal), () => {
      const fresh = cacheGet(metalCacheKey(metal), isMetalPriceFor(metal))
      if (fresh && fresh.fetchedAt !== fetchedAtRef.current) {
        apply(fresh as MetalPrice)
        auto.reschedule()
      }
    })

    return () => {
      requestId.current++ // drop late responses
      auto.stop()
      autoRef.current = null
      unsubscribe()
      setRefreshing(false)
    }
  }, [metal, enabled, load, apply]) // initialPriceUsd intentionally excluded: used only as useState seed

  useEffect(() => {
    autoRef.current?.reschedule()
  }, [fetchedAt])

  const refresh = useCallback(() => {
    if (autoRef.current) void autoRef.current.refreshNow()
  }, [])

  const hasPrice = price !== null
  return {
    price,
    priceTime,
    fetchedAt,
    // Enabled with no price yet and no failure → still loading (covers the
    // render between `enabled` flipping on and the effect running).
    loading: enabled && !hasPrice && (loading || !failed),
    refreshing: enabled && hasPrice && refreshing,
    stale,
    staleAgeMs: stale ? staleAgeMs : null,
    refresh,
  }
}
