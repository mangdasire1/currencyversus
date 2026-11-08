"use client"

import { useEffect, useState } from "react"
import { TIME_PERIODS } from "@/lib/currencies"
import { deriveChartPeriods, seriesRange } from "@/lib/history"
import type { ChartPeriod } from "@/lib/history"
import { isMetal } from "@/lib/metals"
import { fetchPairSeries } from "@/lib/pair-series"

// Chart periods are tagged with the pair they were derived for; periods for
// any other pair are never returned.
interface ChartState {
  pairKey: string
  periods: ChartPeriod[] | null
  error: string | null
}

// The seven chart periods for (base, target) — the same derivation the pair
// pages run at build time (src/lib/build-data.ts getBuildTimeChart), here from
// the same single series request the historical table makes.
//
// initialPeriods: build-time periods for the page's default pair. They seed
// the state (not an effect), so the default chart is in the server HTML; the
// client then refreshes them in the background.
export function usePairChart(
  base: string,
  target: string,
  initialPeriods?: ChartPeriod[] | null
): { periods: ChartPeriod[] | null; loading: boolean; error: string | null } {
  const pairKey = `${base}_${target}`
  const applicable = !!base && !!target && base !== target && !isMetal(base) && !isMetal(target)
  const [state, setState] = useState<ChartState | null>(
    initialPeriods && initialPeriods.length > 0 ? { pairKey, periods: initialPeriods, error: null } : null
  )

  useEffect(() => {
    if (!applicable) return
    let cancelled = false
    const controller = new AbortController()
    const today = new Date()
    const { start, end } = seriesRange(today, TIME_PERIODS)
    fetchPairSeries(base, target, start, end, controller.signal)
      .then((series) => {
        if (cancelled) return
        const periods = series.length > 0 ? deriveChartPeriods(series, today) : null
        // An empty answer never replaces periods this pair already shows.
        setState((prev) => (periods ? { pairKey, periods, error: null } : prev?.pairKey === pairKey ? prev : { pairKey, periods: null, error: "no data" }))
      })
      .catch((err: Error) => {
        if (cancelled) return
        // Keep the embedded/previous periods for this pair; otherwise say so.
        setState((prev) => (prev?.pairKey === pairKey && prev.periods ? { ...prev, error: err.message } : { pairKey, periods: null, error: err.message }))
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [base, target, pairKey, applicable])

  // initialPeriods always belong to the caller's pair (the home page passes
  // them only for its default pair), so they stand in until this pair's state exists.
  const mine = applicable && state?.pairKey === pairKey ? state : null
  const periods = mine?.periods ?? (applicable && initialPeriods && initialPeriods.length > 0 ? initialPeriods : null)
  return { periods, loading: applicable && periods === null && !mine?.error, error: periods ? null : (mine?.error ?? null) }
}
