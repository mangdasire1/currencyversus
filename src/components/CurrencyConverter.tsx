"use client"

import { useState, useCallback, useEffect, useId } from "react"
import { ArrowLeftRight, ArrowUpDown } from "lucide-react"
import { CurrencySelect } from "./CurrencySelect"
import { SkeletonConverter } from "./SkeletonLoaders"
import { DataFreshness } from "./DataFreshness"
import { useConversion } from "@/hooks/useConversion"
import { CURRENCY_MAP } from "@/lib/currencies"
import { METAL_INFO } from "@/lib/metal-info"
import { isMetal } from "@/lib/metals"
import type { MetalCode } from "@/lib/metals"
import type { MetalUnit } from "@/lib/conversion"
import { formatMetalAmount, formatMoney } from "@/lib/format"
import { parseAmount, amountErrorMessage } from "@/lib/amount"

interface CurrencyConverterProps {
  base: string
  target: string
  onBaseChange: (code: string) => void
  onTargetChange: (code: string) => void
  onSwap?: () => void
  includeMetals?: boolean
  initialOzPriceBaseUsd?: number | null
  initialOzPriceTargetUsd?: number | null
  initialMetalPriceTime?: string | null // provider time of the seeded metal price
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
  initialMetalPriceTime,
}: CurrencyConverterProps) {
  const [amount, setAmount] = useState("1")
  const [metalUnit, setMetalUnit] = useState<MetalUnit>("g")

  const baseIsMetal = isMetal(base)
  const targetIsMetal = isMetal(target)
  const anyMetal = baseIsMetal || targetIsMetal

  // Input policy lives in lib/amount.ts: no negatives, empty is neutral,
  // finite and ≤ 1e15 only, "." as decimal separator.
  const parsedAmount = parseAmount(amount)
  const numericAmount = parsedAmount.ok ? parsedAmount.value : null
  const amountError = parsedAmount.ok ? null : amountErrorMessage(parsedAmount.reason)
  const idBase = useId()
  const amountInputId = `${idBase}-amount`
  const amountErrorId = `${idBase}-amount-error`
  const resultLabelId = `${idBase}-result-label`

  const initialMetalUsd: Partial<Record<MetalCode, number | null>> = {}
  const initialMetalTime: Partial<Record<MetalCode, string | null>> = {}
  if (baseIsMetal && initialOzPriceBaseUsd != null) {
    initialMetalUsd[base as MetalCode] = initialOzPriceBaseUsd
    initialMetalTime[base as MetalCode] = initialMetalPriceTime ?? null
  }
  if (targetIsMetal && initialOzPriceTargetUsd != null) {
    initialMetalUsd[target as MetalCode] = initialOzPriceTargetUsd
    initialMetalTime[target as MetalCode] = initialMetalPriceTime ?? null
  }

  const conv = useConversion(base, target, { amount: numericAmount, metalUnit, initialMetalUsd, initialMetalTime })

  // Convenience
  const baseCurrency = CURRENCY_MAP[base]
  const targetCurrency = CURRENCY_MAP[target]
  const baseMetalInfo = baseIsMetal ? METAL_INFO[base as MetalCode] : null
  const targetMetalInfo = targetIsMetal ? METAL_INFO[target as MetalCode] : null

  // Pair identity: only render a result computed for the current selection.
  const forThisPair = conv.base === base && conv.quote === target

  function formatResult(value: number): string {
    if (targetIsMetal) return formatMetalAmount(value, metalUnit)
    return formatMoney(value, targetCurrency?.decimals ?? 2)
  }

  function missingMessage(): string {
    const metalMissing = conv.missing.includes("metal")
    const fxMissing = conv.missing.includes("fx")
    if (metalMissing && fxMissing) return "Metal price and exchange rate unavailable right now"
    if (metalMissing) return "Metal price unavailable right now — cannot convert"
    if (fxMissing) return "Exchange rate unavailable right now — cannot convert"
    return "Failed to load rates"
  }

  // Screen-reader announcement of the result, only once it has settled (not on
  // every keystroke): the text is published to the live region after a pause.
  const resultText =
    forThisPair && (conv.status === "ready" || conv.status === "stale") && conv.amount !== null && Number.isFinite(conv.amount)
      ? `${formatResult(conv.amount)} ${targetIsMetal ? `${metalUnit} ${targetMetalInfo?.name ?? target}` : target}`
      : ""
  const [announced, setAnnounced] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setAnnounced(resultText), 700)
    return () => clearTimeout(t)
  }, [resultText])

  // --- Result formatting ---
  function renderResult() {
    if (!forThisPair || conv.status === "loading") return <SkeletonConverter />
    if (conv.status === "error" || conv.status === "partial") {
      return (
        <div className="flex flex-col gap-1">
          <p className="text-red-400 text-sm">{missingMessage()}</p>
          <button
            type="button"
            onClick={conv.refresh}
            disabled={conv.refreshing}
            className="self-start inline-flex items-center gap-1 text-xs font-mono text-[#6366f1] hover:underline disabled:opacity-60"
          >
            {conv.refreshing ? "Retrying…" : "Retry"}
          </button>
        </div>
      )
    }
    if (numericAmount === null || conv.amount === null || !Number.isFinite(conv.amount)) {
      // Empty or rejected input: neutral placeholder, no number is computed.
      return (
        <div className="flex flex-col gap-1">
          <div className="rate-value text-4xl font-bold text-slate-500 font-mono tracking-tight">—</div>
          <div className="text-sm text-slate-400 font-mono">{conv.rateLabel}</div>
        </div>
      )
    }

    const prefix = targetIsMetal ? targetMetalInfo?.icon : targetCurrency?.flag
    const suffix = targetIsMetal ? ` ${metalUnit}` : ""

    return (
      <div className="flex flex-col gap-1">
        <div className="rate-value text-4xl font-bold text-white font-mono tracking-tight">
          {`${prefix ?? ""} ${formatResult(conv.amount)}${suffix}`}
        </div>
        <div className="text-sm text-slate-400 font-mono">{conv.rateLabel}</div>
        <DataFreshness conv={conv} onRefresh={base !== target ? conv.refresh : undefined} refreshing={conv.refreshing} />
        {base !== target && (
          <p className="text-[11px] text-slate-600 font-body mt-1">
            Mid-market reference value. Bank buy/sell spreads and fees are not included.
          </p>
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
          aria-label="Swap currencies"
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
          <label htmlFor={amountInputId} className="text-xs text-slate-400 uppercase tracking-widest font-mono">
            Amount
          </label>
          {anyMetal && (
            <div className="flex items-center gap-1 text-xs font-mono" role="group" aria-label="Metal unit">
              {(["g", "oz"] as MetalUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={metalUnit === u}
                  aria-label={u === "g" ? "grams" : "troy ounces"}
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
          {/* type="text" + inputMode="decimal": with type="number" the browser
              turns invalid input into "" and we could not tell "abc" from empty. */}
          <input
            id={amountInputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={amountError !== null}
            aria-describedby={amountError !== null ? amountErrorId : undefined}
            className="flex-1 min-w-0 bg-transparent text-white font-mono text-lg focus:outline-none"
            placeholder="1"
          />
          <span className="text-slate-500 font-mono text-sm flex-shrink-0">
            {baseIsMetal ? metalUnit : base}
          </span>
        </div>
        {amountError !== null && (
          <p id={amountErrorId} role="alert" className="text-xs text-amber-400 font-mono">
            {amountError}
          </p>
        )}
      </div>

      {/* Result */}
      <div className="flex flex-col gap-1" role="group" aria-labelledby={resultLabelId}>
        <span id={resultLabelId} className="text-xs text-slate-400 uppercase tracking-widest font-mono">
          Result
        </span>
        {renderResult()}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announced}
        </div>
      </div>
    </div>
  )
}
