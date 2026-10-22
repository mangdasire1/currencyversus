"use client"

import { useEffect, useId, useState } from "react"
import { ArrowLeftRight } from "lucide-react"
import { CurrencySelect } from "@/components/CurrencySelect"
import { parseAmount, amountErrorMessage } from "@/lib/amount"
import { formatMoney } from "@/lib/format"
import { CURRENCY_MAP } from "@/lib/currencies"
import type { ConversionWithRefresh } from "@/hooks/useConversion"
import { PV, MONO } from "./palette"

interface PilotConverterProps {
  base: string
  target: string
  amount: string
  onAmountChange: (value: string) => void
  conv: ConversionWithRefresh
  onBaseChange: (code: string) => void
  onTargetChange: (code: string) => void
  onSwap: () => void
}

// The page's single control set: amount, From, swap, To — one card — then the
// answer in large type with the inverse rate under it.
export function PilotConverter({ base, target, amount, onAmountChange, conv, onBaseChange, onTargetChange, onSwap }: PilotConverterProps) {
  const id = useId()
  const amountId = `${id}-amount`
  const errorId = `${id}-amount-error`
  const parsed = parseAmount(amount)
  const value = parsed.ok ? parsed.value : null
  const error = parsed.ok ? null : amountErrorMessage(parsed.reason)
  const forThisPair = conv.base === base && conv.quote === target
  const decimals = CURRENCY_MAP[target]?.decimals ?? 2
  const result = forThisPair && value !== null && conv.rate !== null ? value * conv.rate : null

  // Announce the result once it settles, not on every keystroke.
  const resultText = result !== null ? `${formatMoney(result, decimals)} ${target}` : ""
  const [announced, setAnnounced] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setAnnounced(resultText), 700)
    return () => clearTimeout(t)
  }, [resultText])

  return (
    <section aria-label="Converter" className="flex flex-col gap-4">
      <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-4" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={amountId} className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            Amount
          </label>
          <input
            id={amountId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? errorId : undefined}
            className="w-full min-w-0 rounded-xl px-4 py-3 text-lg focus:outline-none"
            style={{ ...MONO, background: PV.raised, border: `1px solid ${PV.border}`, color: PV.text }}
          />
          {error && (
            <p id={errorId} role="alert" className="text-xs" style={{ color: PV.up }}>
              {error}
            </p>
          )}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-3">
          <div className="min-w-0">
            <CurrencySelect value={base} onChange={onBaseChange} label="From" />
          </div>
          <button
            type="button"
            onClick={onSwap}
            aria-label={`Swap currencies: show ${target} to ${base}`}
            className="mb-1 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl"
            style={{ background: PV.raised, border: `1px solid ${PV.border}`, color: PV.accentText }}
          >
            <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <CurrencySelect value={target} onChange={onTargetChange} label="To" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm" style={{ ...MONO, color: PV.dim }}>
          {value !== null ? `${formatMoney(value, CURRENCY_MAP[base]?.decimals ?? 2)} ${base} =` : `— ${base} =`}
        </p>
        <p className="text-[38px] sm:text-[52px] leading-tight font-semibold break-words" style={{ ...MONO, color: PV.text }}>
          {result !== null ? formatMoney(result, decimals) : "—"} <span className="text-[0.5em]" style={{ color: PV.dim }}>{target}</span>
        </p>
        {forThisPair && conv.rate !== null && (
          <p className="text-sm" style={{ ...MONO, color: PV.dim }}>
            {conv.rateLabel} · {conv.inverseRateLabel}
          </p>
        )}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announced}
        </div>
      </div>
    </section>
  )
}
