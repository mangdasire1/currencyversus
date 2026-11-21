"use client"

import { useEffect, useId, useState } from "react"
import { fetchRateOn } from "@/lib/api"
import { parseAmount, amountErrorMessage } from "@/lib/amount"
import { formatMoney } from "@/lib/format"
import { usedDayNote, twoDatesSentence } from "@/lib/pilot-format"
import { CURRENCY_MAP } from "@/lib/currencies"
import type { HistoricalPoint } from "@/lib/types"
import { PV, MONO, SANS } from "./palette"

const EARLIEST = "1999-01-04" // first ECB reference rate
const ISO = /^\d{4}-\d{2}-\d{2}$/

interface TwoDatesToolProps {
  base: string
  target: string
  // Server-rendered default: 100 units, ten years ago (from the embedded series)
  defaultRequested: string
  defaultUsed: HistoricalPoint | null
  // First date, owned by the page so a swap can carry it to the reverse pair
  date: string
  onDateChange: (date: string) => void
  // Second date; null = today (the current rate). Owned by the page.
  secondDate: string | null
  onSecondDateChange: (date: string | null) => void
  // Amount, owned by the page so the share link can carry it
  amount: string
  onAmountChange: (amount: string) => void
  sharePath: string // this view's address on the site ("/usd-vs-try/?amount=…")
  sharedNote: string | null // set when the page was opened from a shared link
  currentRate: number | null
  currentDate: string | null // ECB date of the current rate
  builtAt: string // ISO; server and first client render use it as "today"
}

interface Loaded {
  requested: string
  used: HistoricalPoint
}

// The rate on one requested date: fetched when the date changes, aborted when
// it changes again. `initial` is the server-rendered value for the default date.
function useRateOn(requested: string | null, valid: boolean, base: string, target: string, initial: Loaded | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (requested === null || !valid || (loaded && loaded.requested === requested)) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetchRateOn(requested, base, target, controller.signal)
      .then((r) => setLoaded({ requested, used: { date: r.date, rate: r.rate } }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError("The rate for that date could not be loaded. Please try again.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [requested, valid, base, target, loaded])
  const current = requested !== null && loaded && loaded.requested === requested ? loaded.used : null
  return { used: current, loading, error }
}

// "Same amount, two dates": what an amount converted to on two dates. The
// second date is today unless one is chosen.
export function TwoDatesTool({
  base,
  target,
  defaultRequested,
  defaultUsed,
  date,
  onDateChange,
  secondDate,
  onSecondDateChange,
  amount,
  onAmountChange,
  sharePath,
  sharedNote,
  currentRate,
  currentDate,
  builtAt,
}: TwoDatesToolProps) {
  const id = useId()
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle")

  // Same value on server and first client render (no hydration mismatch on
  // the inputs' max); the real date is set after mount.
  const [today, setToday] = useState(builtAt.slice(0, 10))
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), [])
  const inRange = (d: string) => ISO.test(d) && d >= EARLIEST && d <= today
  const dateValid = inRange(date)
  const secondValid = secondDate === null || inRange(secondDate)

  const parsed = parseAmount(amount)
  const value = parsed.ok ? parsed.value : null
  const amountError = parsed.ok ? null : amountErrorMessage(parsed.reason)

  const first = useRateOn(date, dateValid, base, target, defaultUsed ? { requested: defaultRequested, used: defaultUsed } : null)
  const second = useRateOn(secondDate, secondValid, base, target, null)

  // Second side: a chosen date's rate, or today's (current) rate.
  const secondPoint: HistoricalPoint | null =
    secondDate === null ? (currentRate !== null && currentDate ? { date: currentDate, rate: currentRate } : null) : second.used

  const dec = CURRENCY_MAP[target]?.decimals ?? 2
  const firstValue = first.used && value !== null ? value * first.used.rate : null
  const secondValue = secondPoint && value !== null ? value * secondPoint.rate : null
  const notes = [
    first.used ? usedDayNote(date, first.used.date) : null,
    secondDate !== null && second.used ? usedDayNote(secondDate, second.used.date) : null,
  ].filter((n): n is string => n !== null)
  const sentence =
    value !== null && first.used && secondPoint && firstValue !== null && secondValue !== null
      ? twoDatesSentence(value, base, target, { date: first.used.date, value: firstValue }, { date: secondPoint.date, value: secondValue })
      : null

  // A new result invalidates "Copied".
  useEffect(() => setCopyState("idle"), [sentence])
  useEffect(() => setShareState("idle"), [sharePath])

  // The link to this exact view. Copied, never sent anywhere.
  async function share() {
    const url = `${window.location.origin}${sharePath}`
    try {
      await navigator.clipboard.writeText(url)
      setShareState("copied")
    } catch {
      setShareState("failed") // the address bar already holds the same link
    }
  }

  async function copy() {
    if (!sentence) return
    try {
      await navigator.clipboard.writeText(sentence)
      setCopyState("copied")
    } catch {
      setCopyState("failed") // the sentence stays on screen to copy by hand
    }
  }

  const inputStyle = { ...MONO, background: PV.raised, border: `1px solid ${PV.border}`, color: PV.text, colorScheme: "dark" as const }

  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-4">
      <h2 id={`${id}-h`} className="text-lg font-semibold" style={{ ...SANS, color: PV.text }}>
        Same amount, two dates
      </h2>
      {sharedNote && (
        <p role="status" className="text-sm rounded-xl p-3" style={{ color: PV.text, background: PV.surface, border: `1px solid ${PV.border}` }}>
          {sharedNote}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            onChange={(e) => onAmountChange(e.target.value)}
            aria-invalid={amountError !== null}
            aria-describedby={amountError ? `${id}-amount-error` : undefined}
            className="w-full min-w-0 rounded-xl px-4 py-3 min-h-[44px] focus:outline-none"
            style={inputStyle}
          />
          {amountError && (
            <p id={`${id}-amount-error`} role="alert" className="text-xs" style={{ color: PV.up }}>{amountError}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-date`} className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            First date
          </label>
          <input
            id={`${id}-date`}
            type="date"
            min={EARLIEST}
            max={today}
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            aria-invalid={!dateValid}
            aria-describedby={!dateValid ? `${id}-date-error` : undefined}
            className="w-full min-w-0 rounded-xl px-4 py-3 min-h-[44px] focus:outline-none"
            style={inputStyle}
          />
          {!dateValid && (
            <p id={`${id}-date-error`} role="alert" className="text-xs" style={{ color: PV.up }}>
              Choose a date between {EARLIEST} and {today}.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-date2`} className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            Second date
          </label>
          <input
            id={`${id}-date2`}
            type="date"
            min={EARLIEST}
            max={today}
            value={secondDate ?? today}
            onChange={(e) => onSecondDateChange(e.target.value === today ? null : e.target.value)}
            aria-invalid={!secondValid}
            aria-describedby={!secondValid ? `${id}-date2-error` : `${id}-date2-hint`}
            className="w-full min-w-0 rounded-xl px-4 py-3 min-h-[44px] focus:outline-none"
            style={inputStyle}
          />
          {!secondValid ? (
            <p id={`${id}-date2-error`} role="alert" className="text-xs" style={{ color: PV.up }}>
              Choose a date between {EARLIEST} and {today}.
            </p>
          ) : (
            <p id={`${id}-date2-hint`} className="text-xs" style={{ color: PV.dim }}>
              {secondDate === null ? "Today: the latest ECB reference rate." : (
                <button type="button" onClick={() => onSecondDateChange(null)} className="underline underline-offset-4 min-h-[44px]" style={{ color: PV.accentText }}>
                  Back to today
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-live="polite">
        <div className="rounded-xl p-4 min-w-0" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            On {first.used ? first.used.date : date}
          </p>
          <p className="mt-1 text-2xl break-words" style={{ ...MONO, color: PV.text }}>
            {first.loading ? "…" : firstValue !== null ? `${formatMoney(firstValue, dec)} ${target}` : "—"}
          </p>
        </div>
        <div className="rounded-xl p-4 min-w-0" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            {secondDate === null ? `Today${currentDate ? ` (ECB ${currentDate})` : ""}` : `On ${second.used ? second.used.date : secondDate}`}
          </p>
          <p className="mt-1 text-2xl break-words" style={{ ...MONO, color: PV.text }}>
            {second.loading ? "…" : secondValue !== null ? `${formatMoney(secondValue, dec)} ${target}` : "—"}
          </p>
        </div>
      </div>

      {notes.map((n) => <p key={n} className="text-sm" style={{ color: PV.dim }}>{n}</p>)}
      {first.error && <p role="alert" className="text-sm" style={{ color: PV.up }}>{first.error}</p>}
      {second.error && <p role="alert" className="text-sm" style={{ color: PV.up }}>{second.error}</p>}

      {sentence && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl p-4" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
          <p className="text-sm flex-1 min-w-0 break-words" style={{ color: PV.text }}>{sentence}</p>
          <button
            type="button"
            onClick={copy}
            className="self-start sm:self-auto inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 rounded-xl text-sm font-semibold"
            style={{ ...MONO, background: PV.selectedFill, color: "#FFFFFF" }}
          >
            Copy sentence
          </button>
          <span role="status" className="text-xs" style={{ color: PV.dim }}>
            {copyState === "copied" ? "Copied." : copyState === "failed" ? "Could not copy; select the sentence to copy it." : ""}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 rounded-xl text-sm"
          style={{ ...MONO, background: PV.raised, border: `1px solid ${PV.border}`, color: PV.text }}
        >
          Share this comparison
        </button>
        <span role="status" className="text-xs" style={{ color: PV.dim }}>
          {shareState === "copied"
            ? secondDate === null
              ? "Link copied. It opens with today's rate for the second date."
              : "Link copied. Both dates are fixed in it."
            : shareState === "failed"
              ? "Could not copy; the link is in the address bar."
              : ""}
        </span>
      </div>

      <p className="text-sm" style={{ color: PV.dim }}>
        This compares exchange rates on two dates. It is not an investment return: it does not account for inflation,
        interest earned, or any fee.
      </p>
    </section>
  )
}
