"use client"

import { useState, useEffect } from "react"
import { fetchMetalPrice, metalCacheKey } from "@/lib/api"
import type { MetalPrice } from "@/lib/api"
import { cacheGetStale } from "@/lib/cache"
import type { MetalCode } from "@/lib/metals"

interface UseMetalRateResult {
  price: number | null
  priceTime: string | null
  fetchedAt: string | null
  loading: boolean
  stale: boolean
}

// initialPriceUsd: pass the build-time USD oz price for SSR hydration (no skeleton flicker).
// enabled: set false to skip fetching (useful when metal hook is called unconditionally
//          but the current converter pair does not involve this metal).
// initialPriceTime: the provider timestamp that belongs to initialPriceUsd.
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
  const [failed, setFailed] = useState(false)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    const hasData = initialPriceUsd != null
    if (!hasData) { setLoading(true); setStale(false) }
    setFailed(false)

    let cancelled = false
    fetchMetalPrice(metal)
      .then((result) => {
        if (cancelled) return
        setPrice(result.price)
        setPriceTime(result.priceTime)
        setFetchedAt(result.fetchedAt)
        setStale(false)
      })
      .catch(() => {
        if (cancelled) return
        const staleData = cacheGetStale<MetalPrice>(metalCacheKey(metal))
        if (staleData) {
          setPrice(staleData.price)
          setPriceTime(staleData.priceTime)
          setFetchedAt(staleData.fetchedAt)
          setStale(true)
        } else if (hasData) {
          setStale(true)
        } else {
          setFailed(true)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [metal, enabled]) // initialPriceUsd intentionally excluded: used only as useState seed

  return {
    price,
    priceTime,
    fetchedAt,
    // Enabled with no price yet and no failure → still loading (covers the
    // render between `enabled` flipping on and the effect running).
    loading: enabled && (loading || (price === null && !failed)),
    stale,
  }
}
