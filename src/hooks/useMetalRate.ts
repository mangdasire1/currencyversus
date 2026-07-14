"use client"

import { useState, useEffect } from "react"
import { fetchMetalPrice } from "@/lib/api"
import { cacheGetStale } from "@/lib/cache"
import type { MetalCode } from "@/lib/metals"

interface UseMetalRateResult {
  price: number | null
  date: string | null
  loading: boolean
  stale: boolean
}

// initialPriceUsd: pass the build-time USD oz price for SSR hydration (no skeleton flicker).
// enabled: set false to skip fetching (useful when metal hook is called unconditionally
//          but the current converter pair does not involve this metal).
export function useMetalRate(
  metal: MetalCode,
  initialPriceUsd?: number | null,
  enabled = true
): UseMetalRateResult {
  const [price, setPrice] = useState<number | null>(initialPriceUsd ?? null)
  const [date, setDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled && initialPriceUsd == null)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    const hasData = initialPriceUsd != null
    if (!hasData) { setLoading(true); setStale(false) }

    let cancelled = false
    fetchMetalPrice(metal)
      .then((result) => {
        if (cancelled) return
        setPrice(result.price)
        setDate(result.date)
        setStale(false)
      })
      .catch(() => {
        if (cancelled) return
        const cacheKey = `metal_${metal}` // matches fetchMetalPrice key before cv_ prefix
        const staleData = cacheGetStale<{ price: number; date: string }>(cacheKey)
        if (staleData) {
          setPrice(staleData.price)
          setDate(staleData.date)
          setStale(true)
        } else if (hasData) {
          setStale(true)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [metal, enabled]) // initialPriceUsd intentionally excluded: used only as useState seed

  return { price, date, loading, stale }
}
