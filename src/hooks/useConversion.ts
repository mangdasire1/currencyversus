"use client"

import { useExchangeRate } from "./useExchangeRate"
import { useMetalRate } from "./useMetalRate"
import { computeConversion, isMetalCode } from "@/lib/conversion"
import type { ConversionInput, ConversionResult, FxQuote, MetalQuote, MetalUnit } from "@/lib/conversion"
import type { ExchangeRate } from "@/lib/types"
import type { MetalCode } from "@/lib/metals"

interface UseConversionOptions {
  amount?: number | null
  metalUnit?: MetalUnit
  // Build-time seeds (no skeleton on first paint)
  initialFx?: ExchangeRate | null
  initialMetalUsd?: Partial<Record<MetalCode, number | null>>
  initialMetalTime?: Partial<Record<MetalCode, string | null>>
}

// Data-layer controls that travel with the inputs.
export interface RefreshControls {
  refresh: () => void // manual "check now" for every source this pair uses
  refreshing: boolean // a request is in flight while values are shown
}

export type ConversionInputsWithRefresh = ConversionInput & RefreshControls
export type ConversionWithRefresh = ConversionResult & RefreshControls

// Wires the data hooks into the pure conversion model. Every UI surface that
// shows a rate for (base, quote) goes through this, so they all agree.
export function useConversion(base: string, quote: string, options: UseConversionOptions = {}): ConversionWithRefresh {
  const { refresh, refreshing, ...inputs } = useConversionInputs(base, quote, options)
  return { ...computeConversion(inputs), refresh, refreshing }
}

// The fetched inputs for (base, quote). Use directly when one page needs the
// same pair in several units (e.g. per oz and per gram) from a single fetch.
export function useConversionInputs(
  base: string,
  quote: string,
  { amount = 1, metalUnit = "g", initialFx, initialMetalUsd, initialMetalTime }: UseConversionOptions = {}
): ConversionInputsWithRefresh {
  const baseIsMetal = isMetalCode(base)
  const quoteIsMetal = isMetalCode(quote)
  const identity = base === quote

  // Which FX pair this direction needs (if any). For metal↔currency it is
  // USD→currency; metal prices are quoted in USD.
  let fxBase = base
  let fxQuote = quote
  if (baseIsMetal !== quoteIsMetal) {
    fxBase = "USD"
    fxQuote = baseIsMetal ? quote : base
  }
  const needsFx = !identity && !(baseIsMetal && quoteIsMetal) && !(fxBase === "USD" && fxQuote === "USD")

  // Hook count must stay constant: when no FX is needed, query a pair the
  // hook treats as non-applicable (identity) so nothing is fetched.
  const fx = useExchangeRate(
    needsFx ? fxBase : "USD",
    needsFx ? fxQuote : "USD",
    needsFx ? initialFx : null
  )

  // One hook per metal, always called (hook count must stay constant); a
  // metal this pair does not use is disabled and fetches nothing.
  const wants = (code: MetalCode) => !identity && (base === code || quote === code)
  const gold = useMetalRate("XAU", initialMetalUsd?.XAU ?? null, wants("XAU"), initialMetalTime?.XAU)
  const silver = useMetalRate("XAG", initialMetalUsd?.XAG ?? null, wants("XAG"), initialMetalTime?.XAG)
  const platinum = useMetalRate("XPT", initialMetalUsd?.XPT ?? null, wants("XPT"), initialMetalTime?.XPT)
  const palladium = useMetalRate("XPD", initialMetalUsd?.XPD ?? null, wants("XPD"), initialMetalTime?.XPD)
  const used = ([["XAU", gold], ["XAG", silver], ["XPT", platinum], ["XPD", palladium]] as const).filter(([code]) => wants(code))

  const fxQuoteObj: FxQuote | null =
    needsFx && fx.data
      ? {
          base: fx.data.base,
          quote: fxQuote,
          rate: fx.data.rates[fxQuote],
          date: fx.data.date ?? null,
          fetchedAt: fx.data.fetchedAt ?? null,
          stale: fx.stale,
          staleAgeMs: fx.staleAgeMs,
        }
      : null

  const metals: Record<string, MetalQuote | null> = {}
  for (const [code, m] of used) {
    metals[code] = m.price !== null
      ? { metal: code, usdPerOz: m.price, priceTime: m.priceTime, fetchedAt: m.fetchedAt, stale: m.stale, staleAgeMs: m.staleAgeMs }
      : null
  }

  return {
    base,
    quote,
    amount,
    metalUnit,
    fx: fxQuoteObj,
    metals,
    fxLoading: needsFx && fx.loading,
    metalLoading: used.some(([, m]) => m.loading),
    refresh: () => {
      if (needsFx) fx.refresh()
      for (const [, m] of used) m.refresh()
    },
    refreshing: (needsFx && fx.refreshing) || used.some(([, m]) => m.refreshing),
  }
}
