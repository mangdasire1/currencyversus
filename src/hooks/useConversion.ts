"use client"

import { useExchangeRate } from "./useExchangeRate"
import { useMetalRate } from "./useMetalRate"
import { computeConversion, isMetalCode } from "@/lib/conversion"
import type { ConversionInput, ConversionResult, FxQuote, MetalQuote, MetalUnit } from "@/lib/conversion"
import type { ExchangeRate } from "@/lib/types"

interface UseConversionOptions {
  amount?: number | null
  metalUnit?: MetalUnit
  // Build-time seeds (no skeleton on first paint)
  initialFx?: ExchangeRate | null
  initialMetalUsd?: Partial<Record<"XAU" | "XAG", number | null>>
  initialMetalTime?: Partial<Record<"XAU" | "XAG", string | null>>
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

  const wantGold = !identity && (base === "XAU" || quote === "XAU")
  const wantSilver = !identity && (base === "XAG" || quote === "XAG")
  const gold = useMetalRate("XAU", initialMetalUsd?.XAU ?? null, wantGold, initialMetalTime?.XAU)
  const silver = useMetalRate("XAG", initialMetalUsd?.XAG ?? null, wantSilver, initialMetalTime?.XAG)

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

  const metals: Record<string, MetalQuote | null> = {
    XAU: wantGold && gold.price !== null
      ? { metal: "XAU", usdPerOz: gold.price, priceTime: gold.priceTime, fetchedAt: gold.fetchedAt, stale: gold.stale, staleAgeMs: gold.staleAgeMs }
      : null,
    XAG: wantSilver && silver.price !== null
      ? { metal: "XAG", usdPerOz: silver.price, priceTime: silver.priceTime, fetchedAt: silver.fetchedAt, stale: silver.stale, staleAgeMs: silver.staleAgeMs }
      : null,
  }

  return {
    base,
    quote,
    amount,
    metalUnit,
    fx: fxQuoteObj,
    metals,
    fxLoading: needsFx && fx.loading,
    metalLoading: (wantGold && gold.loading) || (wantSilver && silver.loading),
    refresh: () => {
      if (needsFx) fx.refresh()
      if (wantGold) gold.refresh()
      if (wantSilver) silver.refresh()
    },
    refreshing: (needsFx && fx.refreshing) || (wantGold && gold.refreshing) || (wantSilver && silver.refreshing),
  }
}
