"use client"

import { useState, useCallback } from "react"
import { ArrowLeftRight, ArrowUpDown, RefreshCw } from "lucide-react"
import { CurrencySelect } from "./CurrencySelect"
import { SkeletonConverter } from "./SkeletonLoaders"
import { useConversion } from "@/hooks/useConversion"
import { CURRENCY_MAP } from "@/lib/currencies"
import { METAL_INFO } from "@/lib/metal-info"
import { isMetal } from "@/lib/metals"
import type { MetalCode } from "@/lib/metals"
import type { MetalUnit } from "@/lib/conversion"

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

  const numericAmount = parseFloat(amount) || 0

  const initialMetalUsd: Partial<Record<MetalCode, number | null>> = {}
  if (baseIsMetal && initialOzPriceBaseUsd != null) initialMetalUsd[base as MetalCode] = initialOzPriceBaseUsd
  if (targetIsMetal && initialOzPriceTargetUsd != null) initialMetalUsd[target as MetalCode] = initialOzPriceTargetUsd

  const conv = useConversion(base, target, { amount: numericAmount, metalUnit, initialMetalUsd })

  // Convenience
  const baseCurrency = CURRENCY_MAP[base]
  const targetCurrency = CURRENCY_MAP[target]
  const baseMetalInfo = baseIsMetal ? METAL_INFO[base as MetalCode] : null
  const targetMetalInfo = targetIsMetal ? METAL_INFO[target as MetalCode] : null

  // Pair identity: only render a result computed for the current selection.
  const forThisPair = conv.base === base && conv.quote === target

  function formatResult(value: number): string {
    if (targetIsMetal) {
      return value !== 0 && Math.abs(value) < 1
        ? value.toLocaleString("en-US", { maximumSignificantDigits: 4 })
        : fmtNum(value, metalUnit === "oz" ? 4 : 2)
    }
    return fmtNum(value, targetCurrency?.decimals ?? 2)
  }

  function missingMessage(): string {
    const metalMissing = conv.missing.includes("metal")
    const fxMissing = conv.missing.includes("fx")
    if (metalMissing && fxMissing) return "Metal price and exchange rate unavailable right now"
    if (metalMissing) return "Metal price unavailable right now — cannot convert"
    if (fxMissing) return "Exchange rate unavailable right now — cannot convert"
    return "Failed to load rates"
  }

  // --- Result formatting ---
  function renderResult() {
    if (!forThisPair || conv.status === "loading") return <SkeletonConverter />
    if (conv.status === "error" || conv.status === "partial" || conv.amount === null) {
      return <p className="text-red-400 text-sm">{missingMessage()}</p>
    }

    const prefix = targetIsMetal ? targetMetalInfo?.icon : targetCurrency?.flag
    const suffix = targetIsMetal ? ` ${metalUnit}` : ""

    return (
      <div className="flex flex-col gap-1">
        <div className="rate-value text-4xl font-bold text-white font-mono tracking-tight">
          {`${prefix ?? ""} ${formatResult(conv.amount)}${suffix}`}
        </div>
        <div className="text-sm text-slate-400 font-mono">{conv.rateLabel}</div>
        <div className="flex items-center gap-1.5 mt-1">
          {conv.status === "stale" && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <RefreshCw className="w-3 h-3" />
              Showing cached data
            </span>
          )}
          {conv.sourceDate && conv.status !== "stale" && (
            <span className="text-xs text-slate-500">Updated {conv.sourceDate}</span>
          )}
        </div>
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
