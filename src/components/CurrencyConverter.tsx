"use client"

import { useState, useCallback } from "react"
import { ArrowLeftRight, ArrowUpDown, RefreshCw } from "lucide-react"
import { CurrencySelect } from "./CurrencySelect"
import { SkeletonConverter } from "./SkeletonLoaders"
import { useExchangeRate } from "@/hooks/useExchangeRate"
import { useMetalRate } from "@/hooks/useMetalRate"
import { CURRENCY_MAP } from "@/lib/currencies"
import { METAL_INFO } from "@/lib/metal-info"
import { OZ_TO_GRAM, isMetal } from "@/lib/metals"
import type { MetalCode } from "@/lib/metals"
import { formatRate } from "@/lib/utils"

type MetalUnit = "oz" | "g"

interface CurrencyConverterProps {
  base: string
  target: string
  onBaseChange: (code: string) => void
  onTargetChange: (code: string) => void
  onSwap?: () => void
  includeMetals?: boolean
  initialOzPriceBaseUsd?: number | null
  initialOzPriceTargetUsd?: number | null
}

function fmtNum(value: number, decimals: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function CurrencyConverter({
  base,
  target,
  onBaseChange,
  onTargetChange,
  onSwap,
  includeMetals = false,
  initialOzPriceBaseUsd,
  initialOzPriceTargetUsd,
}: CurrencyConverterProps) {
  const [amount, setAmount] = useState("1")
  const [metalUnit, setMetalUnit] = useState<MetalUnit>("g")

  const baseIsMetal = isMetal(base)
  const targetIsMetal = isMetal(target)
  const anyMetal = baseIsMetal || targetIsMetal

  // 1. Currency-to-currency rate (hook guards against metal codes via isMetal check in hook)
  const { data: fxData, loading: fxLoading, stale: fxStale, error: fxError } =
    useExchangeRate(base, target)

  // 2. Metal prices in USD — always call both hooks, enabled only when relevant
  const { price: goldUsd, stale: goldStale } = useMetalRate(
    "XAU",
    base === "XAU" ? initialOzPriceBaseUsd : target === "XAU" ? initialOzPriceTargetUsd : null,
    base === "XAU" || target === "XAU"
  )
  const { price: silverUsd, stale: silverStale } = useMetalRate(
    "XAG",
    base === "XAG" ? initialOzPriceBaseUsd : target === "XAG" ? initialOzPriceTargetUsd : null,
    base === "XAG" || target === "XAG"
  )

  // 3. USD/currency rate needed for metal ↔ non-USD-currency conversions
  // currencyCode = the non-metal side (if any); null when both sides are metal
  const currencyCode: string | null =
    baseIsMetal && !targetIsMetal ? target
    : !baseIsMetal && targetIsMetal ? base
    : null
  const needUsdFx = currencyCode !== null && currencyCode !== "USD"
  // Use a stable dummy ("EUR") when not needed so the hook count stays the same
  const usdFxSym = needUsdFx ? currencyCode! : "EUR"
  const { data: usdFxData } = useExchangeRate("USD", usdFxSym)
  const usdToCurrency: number | null =
    currencyCode === "USD" ? 1
    : needUsdFx ? (usdFxData?.rates[usdFxSym] ?? null)
    : null

  // Convenience
  const baseCurrency = CURRENCY_MAP[base]
  const targetCurrency = CURRENCY_MAP[target]
  const baseMetalInfo = baseIsMetal ? METAL_INFO[base as MetalCode] : null
  const targetMetalInfo = targetIsMetal ? METAL_INFO[target as MetalCode] : null
  const baseMetalUsd = base === "XAU" ? goldUsd : base === "XAG" ? silverUsd : null
  const targetMetalUsd = target === "XAU" ? goldUsd : target === "XAG" ? silverUsd : null

  const numericAmount = parseFloat(amount) || 0
  const ozFactor = metalUnit === "g" ? 1 / OZ_TO_GRAM : 1

  // --- Compute result ---
  let converted: number | null = null
  let loading = fxLoading
  const stale = anyMetal ? (goldStale || silverStale) : fxStale
  const error = !anyMetal ? fxError : null

  if (!anyMetal) {
    // Currency → Currency
    const rate = fxData?.rates[target] ?? null
    converted = rate !== null ? numericAmount * rate : null
  } else if (baseIsMetal && !targetIsMetal) {
    // Metal → Currency
    loading = false
    if (baseMetalUsd !== null && usdToCurrency !== null) {
      const amountInOz = numericAmount * ozFactor
      converted = amountInOz * baseMetalUsd * usdToCurrency
    }
  } else if (!baseIsMetal && targetIsMetal) {
    // Currency → Metal
    loading = false
    if (targetMetalUsd !== null && usdToCurrency !== null) {
      const currencyPerOz = targetMetalUsd * usdToCurrency
      const inOz = numericAmount / currencyPerOz
      converted = metalUnit === "g" ? inOz * OZ_TO_GRAM : inOz
    }
  } else {
    // Metal → Metal (ratio-based)
    loading = false
    if (baseMetalUsd !== null && targetMetalUsd !== null && targetMetalUsd > 0) {
      converted = numericAmount * (baseMetalUsd / targetMetalUsd)
    }
  }

  // --- Result formatting ---
  function renderResult() {
    if (loading) return <SkeletonConverter />
    if (error) return <p className="text-red-400 text-sm">Failed to load rates</p>

    if (!anyMetal) {
      // Standard currency result
      const rate = fxData?.rates[target] ?? null
      return (
        <div className="flex flex-col gap-1">
          <div className="rate-value text-4xl font-bold text-white font-mono tracking-tight">
            {converted !== null && targetCurrency
              ? `${targetCurrency.flag} ${fmtNum(converted, targetCurrency.decimals)}`
              : "—"}
          </div>
          {rate !== null && baseCurrency && targetCurrency && (
            <div className="text-sm text-slate-400 font-mono">
              1 {base} = {formatRate(rate, targetCurrency)} {target}
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            {stale && (
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <RefreshCw className="w-3 h-3" />
                Showing cached data
              </span>
            )}
            {fxData?.date && !stale && (
              <span className="text-xs text-slate-500">Updated {fxData.date}</span>
            )}
          </div>
        </div>
      )
    }

    if (baseIsMetal && !targetIsMetal) {
      // Metal → Currency
      const unitLabel = metalUnit
      const convDec = targetCurrency?.decimals ?? 2
      return (
        <div className="flex flex-col gap-1">
          <div className="rate-value text-4xl font-bold text-white font-mono tracking-tight">
            {converted !== null && targetCurrency
              ? `${targetCurrency.flag} ${fmtNum(converted, convDec)}`
              : "—"}
          </div>
          {converted !== null && baseMetalUsd !== null && usdToCurrency !== null && (
            <div className="text-sm text-slate-400 font-mono">
              1 {unitLabel} {baseMetalInfo?.name} ={" "}
              {fmtNum(
                (unitLabel === "g" ? 1 / OZ_TO_GRAM : 1) * baseMetalUsd * usdToCurrency,
                convDec
              )}{" "}
              {target}
            </div>
          )}
          {stale && (
            <span className="flex items-center gap-1 text-xs text-amber-400 mt-1">
              <RefreshCw className="w-3 h-3" /> Showing cached data
            </span>
          )}
        </div>
      )
    }

    if (!baseIsMetal && targetIsMetal) {
      // Currency → Metal
      const convDec = metalUnit === "oz" ? 4 : 2
      return (
        <div className="flex flex-col gap-1">
          <div className="rate-value text-4xl font-bold text-white font-mono tracking-tight">
            {converted !== null && targetMetalInfo
              ? `${targetMetalInfo.icon} ${fmtNum(converted, convDec)} ${metalUnit}`
              : "—"}
          </div>
          {converted !== null && targetMetalUsd !== null && usdToCurrency !== null && (
            <div className="text-sm text-slate-400 font-mono">
              1 {target} ={" "}
              {fmtNum(1 / ((metalUnit === "g" ? 1 / OZ_TO_GRAM : 1) * targetMetalUsd * usdToCurrency), convDec)}{" "}
              {metalUnit} {targetMetalInfo?.name}
            </div>
          )}
          {stale && (
            <span className="flex items-center gap-1 text-xs text-amber-400 mt-1">
              <RefreshCw className="w-3 h-3" /> Showing cached data
            </span>
          )}
        </div>
      )
    }

    // Metal → Metal
    return (
      <div className="flex flex-col gap-1">
        <div className="rate-value text-4xl font-bold text-white font-mono tracking-tight">
          {converted !== null && targetMetalInfo
            ? `${targetMetalInfo.icon} ${fmtNum(converted, metalUnit === "oz" ? 4 : 2)} ${metalUnit}`
            : "—"}
        </div>
        {baseMetalUsd !== null && targetMetalUsd !== null && targetMetalUsd > 0 && (
          <div className="text-sm text-slate-400 font-mono">
            1 {metalUnit} {baseMetalInfo?.name} ={" "}
            {fmtNum(
              (metalUnit === "g" ? 1 / OZ_TO_GRAM : 1) * baseMetalUsd /
              ((metalUnit === "g" ? 1 / OZ_TO_GRAM : 1) * targetMetalUsd),
              4
            )}{" "}
            {metalUnit} {targetMetalInfo?.name}
          </div>
        )}
        {stale && (
          <span className="flex items-center gap-1 text-xs text-amber-400 mt-1">
            <RefreshCw className="w-3 h-3" /> Showing cached data
          </span>
        )}
      </div>
    )
  }

  const handleSwap = useCallback(() => {
    if (onSwap) {
      onSwap()
    } else {
      onBaseChange(target)
      onTargetChange(base)
    }
  }, [base, target, onBaseChange, onTargetChange, onSwap])

  return (
    <div className="glass-card p-6 flex flex-col gap-6">
      {/* Currency/metal selectors: single column on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="relative flex-1 min-w-0">
          <CurrencySelect
            value={base}
            onChange={onBaseChange}
            label="From"
            includeMetals={includeMetals}
          />
        </div>

        <button
          type="button"
          onClick={handleSwap}
          className="swap-btn self-center sm:mt-6 p-2.5 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 hover:bg-[#6366f1]/20 hover:border-[#6366f1]/40 text-[#6366f1]"
          title="Swap"
        >
          <ArrowUpDown className="w-4 h-4 sm:hidden" />
          <ArrowLeftRight className="w-4 h-4 hidden sm:block" />
        </button>

        <div className="relative flex-1 min-w-0">
          <CurrencySelect
            value={target}
            onChange={onTargetChange}
            label="To"
            includeMetals={includeMetals}
          />
        </div>
      </div>

      {/* Amount input */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400 uppercase tracking-widest font-mono">
            Amount
          </label>
          {anyMetal && (
            <div className="flex items-center gap-1 text-xs font-mono">
              {(["g", "oz"] as MetalUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setMetalUnit(u)}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    metalUnit === u
                      ? "bg-[#6366f1]/30 text-[#6366f1] border border-[#6366f1]/40"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {u}
                </button>
              ))}
              {(baseIsMetal || (!baseIsMetal && targetIsMetal)) && (
                <span className="text-slate-600 ml-1">
                  {baseIsMetal ? baseMetalInfo?.icon : targetMetalInfo?.icon}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus-within:border-[#6366f1]/50 transition-colors min-w-0">
          <span className="text-slate-400 font-mono text-sm flex-shrink-0">
            {baseIsMetal ? baseMetalInfo?.icon : baseCurrency?.flag}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="any"
            className="flex-1 min-w-0 bg-transparent text-white font-mono text-lg focus:outline-none"
            placeholder="1"
          />
          <span className="text-slate-500 font-mono text-sm flex-shrink-0">
            {baseIsMetal ? metalUnit : base}
          </span>
        </div>
      </div>

      {/* Result */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-widest font-mono">
          Result
        </label>
        {renderResult()}
      </div>
    </div>
  )
}
