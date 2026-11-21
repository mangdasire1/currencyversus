"use client"

import { useEffect, useId, useState } from "react"
import {
  WEIGHT_UNITS, DEFAULT_WEIGHT_UNIT, GRAMS_PER_TROY_OUNCE, GRAMS_PER_AVOIRDUPOIS_OUNCE,
  unitInfo, solveConverter, formatSignificant,
} from "@/lib/metal-units"
import type { ConverterSide, WeightUnit } from "@/lib/metal-units"
import { PV, MONO, SANS } from "@/components/pilot/palette"
import { trNumber, trCurrency } from "@/lib/format-tr"
import { trParseAmount, trAmountErrorMessage } from "@/lib/amount-tr"
import type { Locale } from "@/lib/i18n"

// The right-hand side: money in a currency (metal pages), or a weight of the
// other metal of equal value (gold/silver page; same unit on both sides).
export type ConverterQuote = { kind: "money"; code: string } | { kind: "weight"; code: string; name: string }

interface MetalUnitConverterProps {
  metalName: string // "Silver"
  quote: ConverterQuote
  // Quote units for ONE TROY OUNCE of the metal (gold-api prices are per troy
  // ounce, see src/lib/metal-units.ts). null while unavailable.
  pricePerTroyOunce: number | null
  significant: number // display precision of the result (least precise input)
  status?: string | null // e.g. "Loading price…" when no price yet
  // Turkish pilot pages: Turkish text and figures, the unit the page opens
  // with (gram on /tr/gram-altin/), and a note placed right under the result.
  locale?: Locale
  initialUnit?: WeightUnit
  resultNote?: React.ReactNode
}

// Turkish unit names: control label, plural/singular are the same in Turkish.
const UNIT_TR: Record<WeightUnit, string> = { ozt: "troy ons", g: "gram", kg: "kg", oz: `ons (${trNumber(GRAMS_PER_AVOIRDUPOIS_OUNCE.toFixed(2))} g)` }
const UNIT_TR_NAME: Record<WeightUnit, string> = { ozt: "troy ons", g: "gram", kg: "kilogram", oz: "avoirdupois ons" }
const TROY_NOTE_TR = `Troy ons (${trNumber(GRAMS_PER_TROY_OUNCE.toFixed(4))} g), değerli metallerin standart birimidir; gıdada kullanılan ${trNumber(GRAMS_PER_AVOIRDUPOIS_OUNCE.toFixed(2))} g'lık ons değildir.`

const TROY_NOTE = `Troy ounce (${GRAMS_PER_TROY_OUNCE.toFixed(4)} g) — the standard unit for precious metals, not the ${GRAMS_PER_AVOIRDUPOIS_OUNCE.toFixed(2)} g ounce used for food.`

// Weight ⇄ value for one metal. Both fields are inputs: the one typed in is
// the amount, the other is computed — "1 oz silver to USD" and "how much
// silver for $500" are the same arithmetic. Default 1 troy ounce, rendered on
// the server from the build-time price (state starts from props, no effect).
export function MetalUnitConverter({ metalName, quote, pricePerTroyOunce, significant, status, locale = "en", initialUnit = DEFAULT_WEIGHT_UNIT, resultNote }: MetalUnitConverterProps) {
  const tr = locale === "tr"
  const id = useId()
  const [unit, setUnit] = useState<WeightUnit>(initialUnit)
  const [side, setSide] = useState<ConverterSide>("weight")
  const [text, setText] = useState("1")

  // Weight of the other metal: same unit on both sides, so the ratio applies
  // as is (no conversion through troy ounces).
  // Turkish input ("1.000,5") is read by the Turkish amount policy and handed
  // over in English form: same arithmetic, Turkish error message.
  const trParsed = tr ? trParseAmount(text) : null
  const solved = solveConverter(trParsed && trParsed.ok ? trParsed.canonical : text, side, quote.kind === "weight" ? "ozt" : unit, pricePerTroyOunce)
  const sol = trParsed && !trParsed.ok ? { weight: null, value: null, error: trAmountErrorMessage(trParsed.reason) } : solved
  const u = unitInfo(unit)
  const quoteLabel = quote.kind === "money" ? (tr ? trCurrency(quote.code) : quote.code) : `${u.label} ${quote.name.toLowerCase()}`
  const fmt = (n: number | null) => (n === null ? "" : tr ? trNumber(formatSignificant(n, significant)) : formatSignificant(n, significant))
  const weightText = side === "weight" ? text : fmt(sol.weight)
  const valueText = side === "value" ? text : fmt(sol.value)

  // The typed number is repeated as typed (grouped); only the computed side is rounded.
  const typed = (n: number) => (tr ? trNumber(n.toLocaleString("en-US", { maximumFractionDigits: 8 })) : n.toLocaleString("en-US", { maximumFractionDigits: 8 }))
  const w = sol.weight !== null ? (side === "weight" ? typed(sol.weight) : fmt(sol.weight)) : null
  const v = sol.value !== null ? (side === "value" ? typed(sol.value) : fmt(sol.value)) : null
  const sentence =
    w !== null && v !== null && tr && quote.kind === "money"
      ? `${w} ${UNIT_TR_NAME[unit]} ${metalName.toLocaleLowerCase("tr")} = ${v} ${trCurrency(quote.code)}`
      : w !== null && v !== null
      ? `${w} ${sol.weight === 1 ? u.one : u.name} of ${metalName.toLowerCase()} = ${v} ${quote.kind === "money" ? quote.code : `${sol.value === 1 ? u.one : u.name} of ${quote.name.toLowerCase()}`}`
      : null

  // Announce once the result settles, not on every keystroke.
  const [announced, setAnnounced] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setAnnounced(sentence ?? ""), 700)
    return () => clearTimeout(t)
  }, [sentence])

  const field = (which: ConverterSide, label: string, value: string) => (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={`${id}-${which}`} className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
        {label}
      </label>
      <input
        id={`${id}-${which}`}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setSide(which)
          setText(e.target.value)
        }}
        aria-invalid={side === which && sol.error !== null}
        aria-describedby={side === which && sol.error ? `${id}-error` : undefined}
        className="w-full min-w-0 rounded-xl px-4 py-3 min-h-[44px] text-lg focus:outline-none"
        style={{ ...MONO, background: PV.raised, border: `1px solid ${PV.border}`, color: PV.text }}
      />
    </div>
  )

  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-4">
      <h2 id={`${id}-h`} className="text-lg font-semibold" style={{ ...SANS, color: PV.text }}>
        {tr ? `Ağırlığa göre ${metalName.toLocaleLowerCase("tr")} değeri (${quote.kind === "money" ? trCurrency(quote.code) : quote.name})` : <>{metalName} {quote.kind === "money" ? `to ${quote.code}` : `to ${quote.name}`} by weight</>}
      </h2>
      <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-4" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
        <fieldset className="flex flex-col gap-1.5 min-w-0">
          <legend className="text-xs uppercase tracking-widest mb-1.5" style={{ color: PV.faint }}>
            {tr ? "Birim" : "Unit"}
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WEIGHT_UNITS.map((w) => {
              const checked = w.key === unit
              return (
                <label
                  key={w.key}
                  className="relative flex items-center justify-center min-h-[44px] px-2 rounded-lg text-sm cursor-pointer text-center focus-within:outline focus-within:outline-2 focus-within:outline-offset-2"
                  style={{
                    ...MONO,
                    background: checked ? PV.selectedFill : PV.raised, // white on #4F46E5 passes AA; on #6366F1 it is 4.47:1
                    color: checked ? "#FFFFFF" : PV.dim,
                    border: `1px solid ${checked ? PV.selectedFill : PV.border}`,
                    outlineColor: PV.accentText,
                  }}
                >
                  <input
                    type="radio"
                    name={`${id}-unit`}
                    value={w.key}
                    checked={checked}
                    onChange={() => setUnit(w.key)}
                    className="sr-only"
                  />
                  {tr ? UNIT_TR[w.key] : w.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("weight", tr ? `Ağırlık (${UNIT_TR[unit]})` : `Weight (${u.label})`, weightText)}
          {field("value", tr ? `Değer (${quoteLabel})` : `Value (${quoteLabel})`, valueText)}
        </div>
        {sol.error && (
          <p id={`${id}-error`} role="alert" className="text-xs" style={{ color: PV.up }}>
            {sol.error}
          </p>
        )}

        <p className="text-[26px] sm:text-[32px] leading-tight font-semibold break-words" style={{ ...MONO, color: PV.text }}>
          {sentence ?? (status || "—")}
        </p>
        {resultNote}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announced}
        </div>

        <p className="text-sm" style={{ color: PV.dim }}>{tr ? TROY_NOTE_TR : TROY_NOTE}</p>
        {unit === "oz" && (
          <p className="text-sm" style={{ color: PV.dim }}>
            {tr ? `Avoirdupois onsu (${trNumber(GRAMS_PER_AVOIRDUPOIS_OUNCE.toFixed(4))} g) seçtiniz; gıdada kullanılan ons budur.` : <>You chose the avoirdupois ounce ({GRAMS_PER_AVOIRDUPOIS_OUNCE.toFixed(4)} g), the ounce used for food.</>}
          </p>
        )}
        {quote.kind === "money" && !tr && (
          <p className="text-sm" style={{ color: PV.dim }}>
            Spot value of the pure metal. A jeweller&apos;s or dealer&apos;s buying and selling prices are different.
          </p>
        )}
      </div>
    </section>
  )
}
