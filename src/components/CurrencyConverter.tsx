"use client"

import { useState, useCallback } from "react"
import { ArrowLeftRight, ArrowUpDown, RefreshCw } from "lucide-react"
import { CurrencySelect } from "./CurrencySelect"
import { SkeletonConverter } from "./SkeletonLoaders"
import { useExchangeRate } from "@/hooks/useExchangeRate"
import { CURRENCY_MAP } from "@/lib/currencies"
import { formatRate } from "@/lib/utils"

interface CurrencyConverterProps {
  base: string
  target: string
  onBaseChange: (code: string) => void
  onTargetChange: (code: string) => void
  onSwap?: () => void
}

export function CurrencyConverter({
  base,
  target,
  onBaseChange,
  onTargetChange,
  onSwap,
}: CurrencyConverterProps) {
  const [amount, setAmount] = useState("1")
  const { data, loading, error, stale } = useExchangeRate(base, target)

  const rate = data?.rates[target] ?? null
  const baseCurrency = CURRENCY_MAP[base]
  const targetCurrency = CURRENCY_MAP[target]
  const numericAmount = parseFloat(amount) || 0
  const converted = rate !== null ? numericAmount * rate : null

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
      {/* Single column on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="relative flex-1 min-w-0">
          <CurrencySelect value={base} onChange={onBaseChange} label="From" />
        </div>

        <button
          type="button"
          onClick={handleSwap}
          className="swap-btn self-center sm:mt-6 p-2.5 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 hover:bg-[#6366f1]/20 hover:border-[#6366f1]/40 text-[#6366f1]"
          title="Swap currencies"
        >
          <ArrowUpDown className="w-4 h-4 sm:hidden" />
          <ArrowLeftRight className="w-4 h-4 hidden sm:block" />
        </button>

        <div className="relative flex-1 min-w-0">
          <CurrencySelect value={target} onChange={onTargetChange} label="To" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400 uppercase tracking-widest font-mono">
          Amount
        </label>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus-within:border-[#6366f1]/50 transition-colors min-w-0">
          <span className="text-slate-400 font-mono text-sm flex-shrink-0">{baseCurrency?.flag}</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="any"
            className="flex-1 min-w-0 bg-transparent text-white font-mono text-lg focus:outline-none"
            placeholder="1"
          />
          <span className="text-slate-500 font-mono text-sm flex-shrink-0">{base}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-widest font-mono">
          Result
        </label>
        {loading ? (
          <SkeletonConverter />
        ) : error ? (
          <p className="text-red-400 text-sm">Failed to load rates</p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="rate-value text-4xl font-bold text-white font-mono tracking-tight">
              {converted !== null && targetCurrency
                ? `${targetCurrency.flag} ${new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: targetCurrency.decimals,
                    maximumFractionDigits: targetCurrency.decimals,
                  }).format(converted)}`
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
              {data?.date && !stale && (
                <span className="text-xs text-slate-500">
                  Updated {data.date}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
