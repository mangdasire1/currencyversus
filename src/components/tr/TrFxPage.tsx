"use client"

import { useEffect, useId, useState } from "react"
import { ArrowLeftRight } from "lucide-react"
import { useConversion } from "@/hooks/useConversion"
import { formatMoney } from "@/lib/format"
import { CURRENCY_MAP } from "@/lib/currencies"
import { trMoney, trDateShort } from "@/lib/format-tr"
import { trParseAmount, trAmountErrorMessage, trAmountInput } from "@/lib/amount-tr"
import { trCurrencyName, trRateLabel, trSharedLinkNote } from "@/lib/pilot-format-tr"
import { readShareState, shareQuery, shareFieldCount, SHARE_DEFAULT_AMOUNT } from "@/lib/share-state"
import { DEFAULT_CHART_PERIOD } from "@/lib/history"
import type { ChartPeriod, PeriodHistory } from "@/lib/history"
import type { ExchangeRate, TimePeriod } from "@/lib/types"
import { PairChart } from "@/components/pilot/PairChart"
import { TwoDatesTool } from "@/components/pilot/TwoDatesTool"
import { PilotHistoryTable } from "@/components/pilot/PilotHistoryTable"
import { trHistoryTableText } from "@/lib/history-table-tr"
import { PV, MONO } from "@/components/pilot/palette"
import { TrStaleNote } from "./TrStaleNote"

interface TrFxPageProps {
  path: string // "/tr/dolar-tl/"
  base: "USD" | "EUR"
  target: "TRY"
  initialRate: number | null
  initialDate: string | null
  chart: ChartPeriod[] | null
  initialHistory: PeriodHistory<TimePeriod>[] | null
  builtAt: string
}

// Turkish pilot currency page (task C3-3): Dolar/TL, Euro/TL. The same data
// and components as the English pair page (build-time rate, 7-period chart and
// history table in the static HTML; the browser checks for a newer ECB rate), Turkish text
// and formats. No currency selectors: the page is about one pair; the
// converter works in both directions in place.
export function TrFxPage({ path, base, target, initialRate, initialDate, chart, initialHistory, builtAt }: TrFxPageProps) {
  const id = useId()
  const serverRate: ExchangeRate | null =
    initialRate !== null && initialDate !== null ? { base, date: initialDate, rates: { [target]: initialRate } } : null

  // Converter: "1 dolar = … TL", or the other way round after the swap.
  const [amount, setAmount] = useState("1")
  const [reversed, setReversed] = useState(false)
  const parsed = trParseAmount(amount)
  const value = parsed.ok ? parsed.value : null
  const amountError = parsed.ok ? null : trAmountErrorMessage(parsed.reason)
  const conv = useConversion(base, target, { initialFx: serverRate, amount: 1 })
  const forThisPair = conv.base === base && conv.quote === target
  const rate = (forThisPair ? conv.rate : null) ?? initialRate
  const fxDate = (forThisPair ? conv.fxDate : null) ?? initialDate
  const stale = forThisPair && conv.status === "stale"
  const from = reversed ? target : base
  const to = reversed ? base : target
  const result = value !== null && rate !== null ? (reversed ? value / rate : value * rate) : null
  const resultText = result !== null ? trMoney(formatMoney(result, CURRENCY_MAP[to]?.decimals ?? 2), to) : "—"

  // Chart and two-dates tool, with the English page's share link rules
  // (share-state.ts); the amount travels in English form ("1000.5").
  const tenYear = chart?.find((p) => p.key === "10y") ?? null
  const defaultThenDate = tenYear?.requestedStart ?? builtAt.slice(0, 10)
  const [period, setPeriod] = useState(DEFAULT_CHART_PERIOD)
  const [thenDate, setThenDate] = useState(defaultThenDate)
  const [secondDate, setSecondDate] = useState<string | null>(null)
  const [twoDatesAmount, setTwoDatesAmount] = useState(SHARE_DEFAULT_AMOUNT)
  const shareDefaults = { period: DEFAULT_CHART_PERIOD, from: defaultThenDate, periods: (chart ?? []).map((p) => p.key) }
  const [addressRead, setAddressRead] = useState(false)
  const [sharedNote, setSharedNote] = useState<string | null>(null)
  useEffect(() => {
    const shared = readShareState(window.location.search, { ...shareDefaults, today: new Date().toISOString().slice(0, 10) })
    if (shared.found) {
      setTwoDatesAmount(trAmountInput(shared.state.amount))
      setPeriod(shared.state.period)
      setThenDate(shared.state.from)
      setSecondDate(shared.state.to)
      setSharedNote(trSharedLinkNote(shared.state.to, shared.ignored, shareFieldCount(window.location.search)))
    }
    setAddressRead(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read the address once per page
  }, [chart])
  const twoParsed = trParseAmount(twoDatesAmount)
  const query = shareQuery({ amount: twoParsed.ok ? twoParsed.canonical : twoDatesAmount, period, from: thenDate, to: secondDate }, shareDefaults)
  useEffect(() => {
    if (!addressRead) return
    const next = path + query
    if (window.location.pathname + window.location.search !== next) window.history.replaceState(window.history.state, "", next)
  }, [addressRead, path, query])

  return (
    <>
      <section aria-label="Çevirici" className="flex flex-col gap-4">
        <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
          <label htmlFor={`${id}-amount`} className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>
            Tutar ({trCurrencyName(from)})
          </label>
          <div className="flex gap-2">
            <input
              id={`${id}-amount`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={amountError !== null}
              aria-describedby={amountError !== null ? `${id}-amount-error` : undefined}
              className="w-full min-w-0 rounded-xl px-4 py-3 text-lg focus:outline-none"
              style={{ ...MONO, background: PV.raised, border: `1px solid ${PV.border}`, color: PV.text }}
            />
            <button
              type="button"
              onClick={() => setReversed((r) => !r)}
              aria-label={`Yönü değiştir: ${trCurrencyName(to)} → ${trCurrencyName(from)}`}
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded-xl"
              style={{ background: PV.raised, border: `1px solid ${PV.border}`, color: PV.accentText }}
            >
              <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          {amountError && (
            <p id={`${id}-amount-error`} role="alert" className="text-xs" style={{ color: PV.up }}>{amountError}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0" aria-live="polite">
          <p className="text-sm" style={{ ...MONO, color: PV.dim }}>
            {amount.trim() === "" || value === null ? "—" : amount.trim()} {trCurrencyName(from)} =
          </p>
          <p className="text-[38px] sm:text-[52px] leading-tight font-semibold break-words" style={{ ...MONO, color: PV.text }}>
            {resultText}
          </p>
          {rate !== null && (
            <p className="text-sm" style={{ ...MONO, color: PV.dim }}>
              {trRateLabel(base, target, rate)} · {trRateLabel(target, base, 1 / rate)}
            </p>
          )}
        </div>
        {stale && <TrStaleNote />}
      </section>

      {/* What the figure is, short and visible: the reader will compare it with the bank's rate */}
      <section aria-labelledby={`${id}-source`} className="rounded-xl p-4 flex flex-col gap-2 text-sm leading-relaxed" style={{ background: PV.surface, border: `1px solid ${PV.border}`, color: PV.dim }}>
        <h2 id={`${id}-source`} className="text-sm font-semibold" style={{ color: PV.text }}>
          Bu kur nedir?
        </h2>
        <p>
          Avrupa Merkez Bankası&apos;nın (ECB) günlük referans kurudur (Frankfurter API üzerinden). ECB bu kurları iş günlerinde
          yaklaşık 16:00 CET&apos;te bir kez yayımlar. <strong style={{ color: PV.text }}>Canlı piyasa kuru değildir; bir bankanın ya
          da döviz bürosunun alış/satış kuru da değildir.</strong>
        </p>
        <p>
          Bankada ya da büroda göreceğiniz kur bundan farklı olur ve bu doğaldır: onlar kendi alış/satış marjlarını ekler ve
          kurlarını gün içinde günceller. Bu sayfa günde bir kez yayımlanan referans değeri gösterir.
        </p>
        <p style={MONO}>Kur tarihi: {trDateShort(fxDate) ?? "—"}</p>
      </section>

      {chart && <PairChart base={base} target={target} periods={chart} selected={period} onSelect={setPeriod} locale="tr" />}

      <TwoDatesTool
        base={base}
        target={target}
        defaultRequested={defaultThenDate}
        defaultUsed={tenYear?.start ?? null}
        date={thenDate}
        onDateChange={setThenDate}
        secondDate={secondDate}
        onSecondDateChange={setSecondDate}
        amount={twoDatesAmount}
        onAmountChange={setTwoDatesAmount}
        sharePath={path + query}
        sharedNote={sharedNote}
        currentRate={rate}
        currentDate={fxDate}
        builtAt={builtAt}
        locale="tr"
      />

      <PilotHistoryTable
        base={base}
        target={target}
        currentRate={rate}
        currentLabel={rate !== null ? trRateLabel(base, target, rate) : null}
        currentDate={fxDate}
        initialRows={initialHistory}
        text={trHistoryTableText(base, target)}
      />
    </>
  )
}
