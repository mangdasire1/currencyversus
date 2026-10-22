"use client"

import { useEffect, useId, useState } from "react"
import { fetchRateOn } from "@/lib/api"
import { parseAmount, amountErrorMessage } from "@/lib/amount"
import { formatMoney } from "@/lib/format"
import { usedDayNote } from "@/lib/pilot-format"
import { CURRENCY_MAP } from "@/lib/currencies"
import type { HistoricalPoint } from "@/lib/types"
import { PV, MONO, SANS } from "./palette"

const EARLIEST = "1999-01-04" // first ECB reference rate

interface TwoDatesToolProps {
  base: string
  target: string
  // Server-rendered default: 100 units, ten years ago (from the embedded series)
  defaultRequested: string
  defaultUsed: HistoricalPoint | null
  currentRate: number | null
  currentDate: string | null
  builtAt: string // ISO; server and first client render use it as "today"
}

// "Same amount, two dates": what an amount converted to on one date vs today.
export function TwoDatesTool({ base, target, defaultRequested, defaultUsed, currentRate, currentDate, builtAt }: TwoDatesToolProps) {
  const id = useId()
  const [amount, setAmount] = useState("100")
  const [date, setDate] = useState(defaultRequested)
  const [then, setThen] = useState<{ requested: string; used: HistoricalPoint } | null>(
    defaultUsed ? { requested: defaultRequested, used: defaultUsed } : null
  )
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Same value on server and first client render (no hydration mismatch on
  // the input's max); the real date is set after mount.
  const [today, setToday] = useState(builtAt.slice(0, 10))
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), [])
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= EARLIEST && date <= today
  const parsed = parseAmount(amount)
  const value = parsed.ok ? parsed.value : null
  const amountError = parsed.ok ? null : amountErrorMessage(parsed.reason)

  useEffect(() => {
    if (!dateValid || (then && then.requested === date)) return
    const controller = new AbortController()
    setLoading(true)
    setFetchError(null)
    fetchRateOn(date, base, target, controller.signal)
      .then((r) => setThen({ requested: date, used: { date: r.date, rate: r.rate } }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setFetchError("The rate for that date could not be loaded. Please try again.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [date, dateValid, base, target, then])

  const dec = CURRENCY_MAP[target]?.decimals ?? 2
  const showThen = then && then.requested === date && value !== null
  const thenValue = showThen ? value! * then!.used.rate : null
  const nowValue = value !== null && currentRate !== null ? value * currentRate : null
  const note = showThen ? usedDayNote(then!.requested, then!.used.date) : null

  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-4">
      <h2 id={`${id}-h`} className="text-lg font-semibold" style={{ ...SANS, color: PV.text }}>
        Same amount, two dates
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-amount`} className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            Amount ({base})
          </label>
          <input
            id={`${id}-amount`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={amountError !== null}
            aria-describedby={amountError ? `${id}-amount-error` : undefined}
            className="w-full min-w-0 rounded-xl px-4 py-3 min-h-[44px] focus:outline-none"
            style={{ ...MONO, background: PV.raised, border: `1px solid ${PV.border}`, color: PV.text }}
          />
          {amountError && (
            <p id={`${id}-amount-error`} role="alert" className="text-xs" style={{ color: PV.up }}>{amountError}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-date`} className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            Date
          </label>
          <input
            id={`${id}-date`}
            type="date"
            min={EARLIEST}
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!dateValid}
            aria-describedby={!dateValid ? `${id}-date-error` : undefined}
            className="w-full min-w-0 rounded-xl px-4 py-3 min-h-[44px] focus:outline-none"
            style={{ ...MONO, background: PV.raised, border: `1px solid ${PV.border}`, color: PV.text, colorScheme: "dark" }}
          />
          {!dateValid && (
            <p id={`${id}-date-error`} role="alert" className="text-xs" style={{ color: PV.up }}>
              Choose a date between {EARLIEST} and {today}.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-live="polite">
        <div className="rounded-xl p-4 min-w-0" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            On {showThen ? then!.used.date : date}
          </p>
          <p className="mt-1 text-2xl break-words" style={{ ...MONO, color: PV.text }}>
            {loading ? "…" : thenValue !== null ? `${formatMoney(thenValue, dec)} ${target}` : "—"}
          </p>
        </div>
        <div className="rounded-xl p-4 min-w-0" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            Today{currentDate ? ` (ECB ${currentDate})` : ""}
          </p>
          <p className="mt-1 text-2xl break-words" style={{ ...MONO, color: PV.text }}>
            {nowValue !== null ? `${formatMoney(nowValue, dec)} ${target}` : "—"}
          </p>
        </div>
      </div>

      {note && <p className="text-sm" style={{ color: PV.dim }}>{note}</p>}
      {fetchError && <p role="alert" className="text-sm" style={{ color: PV.up }}>{fetchError}</p>}
      <p className="text-sm" style={{ color: PV.dim }}>
        This compares exchange rates on two dates. It is not an investment return: it does not account for inflation,
        interest earned, or any fee.
      </p>
    </section>
  )
}
