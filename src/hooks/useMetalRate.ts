"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { fetchMetalPrice, metalCacheKey } from "@/lib/api"
import type { MetalPrice } from "@/lib/api"
import { cacheGet, cacheGetStale, onCacheUpdated, FRESH_TTL } from "@/lib/cache"
import { isMetalPriceFor } from "@/lib/cache-schemas"
import { startAutoRefresh, documentVisibility } from "@/lib/refresh"
import { retryAt } from "@/lib/backoff"
import { newest, metalTime } from "@/lib/newer"
import type { AutoRefresh } from "@/lib/refresh"
import type { MetalCode } from "@/lib/metals"

// A price with its times; fetchedAt is null for the build's price.
interface Quote {
  price: number
  priceTime: string | null
  fetchedAt: string | null
}

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
// initialPriceTime: the provider timestamp that belongs to initialPriceUsd; it
// decides whether the build's price or the browser's is newer (src/lib/newer.ts),
// so pass it with every initialPriceUsd.
//
// While enabled, the price is kept current: re-checked when it passes its
// fresh TTL (15 min) while the tab is visible, and on return to the tab. A failed
// check is retried after a growing wait (src/lib/backoff.ts).
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
  const build: Quote | null = initialPriceUsd != null ? { price: initialPriceUsd, priceTime: initialPriceTime ?? null, fetchedAt: null } : null
  const buildRef = useRef(build)
  buildRef.current = build
  const shownRef = useRef(build)

  // Shows the newest of the candidate, the build's price and the one on
  // screen, and returns it.
  const show = useCallback((candidate: Quote): Quote => {
    const best = newest(candidate, [shownRef.current, buildRef.current], metalTime)
    shownRef.current = best
    setPrice(best.price)
    setPriceTime(best.priceTime)
    setFetchedAt(best.fetchedAt)
    return best
  }, [])

  const apply = useCallback(
    (r: MetalPrice) => {
      fetchedAtRef.current = r.fetchedAt // when last checked, even if older than what is shown
      show(r)
      setStale(false)
      setStaleAgeMs(null)
      setFailed(false)
    },
    [show]
  )

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
          const shown = show(staleHit.data)
          setStale(true)
          // the entry's age says nothing about a newer price kept on screen
          setStaleAgeMs(shown === staleHit.data ? staleHit.ageMs : null)
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
    [metal, apply, show]
  )

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    // Before any answer (it can take 10 s, or wait until the tab is seen): the
    // build's price, or the saved one when that is newer.
    if (buildRef.current) {
      const kept = cacheGetStale(metalCacheKey(metal), isMetalPriceFor(metal))
      show(newest<Quote>(buildRef.current, [kept?.data], metalTime))
    }

    const auto = startAutoRefresh({
      freshTtlMs: FRESH_TTL.metal,
      retryAt: () => retryAt(metalCacheKey(metal)),
      getFetchedAt: () => (fetchedAtRef.current ? Date.parse(fetchedAtRef.current) : null),
      refresh: ({ force }) => load(force),
      visibility: documentVisibility(),
    })
    autoRef.current = auto
    void auto.check()

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
  }, [metal, enabled, load, apply, show]) // initialPriceUsd intentionally excluded: read through buildRef

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
