"use client"

import { useHistoricalRates } from "@/hooks/useHistoricalRates"
import { formatFxRate } from "@/lib/format"
import { pairSignificantDigits } from "@/lib/ecb"
import { directionNote } from "@/lib/pilot-format"
import type { PeriodHistory } from "@/lib/history"
import type { TimePeriod } from "@/lib/types"
import type { HistoryTableText } from "@/lib/history-table-tr"
import { Direction } from "./Direction"
import { PV, MONO, SANS } from "./palette"

interface PilotHistoryTableProps {
  base: string
  target: string
  currentRate: number | null
  currentLabel: string | null // "1 USD = 49.6280 TRY"
  currentDate: string | null
  initialRows: PeriodHistory<TimePeriod>[] | null
  // Turkish pages hand in their text and formats (history-table-tr.ts); without
  // it the table is English. Same rows and arithmetic either way.
  text?: HistoryTableText
}

// Period | Then | Used day | Change. The current rate is stated once above
// the table instead of repeating it on all seven rows.
export function PilotHistoryTable({ base, target, currentRate, currentLabel, currentDate, initialRows, text: t }: PilotHistoryTableProps) {
  const { comparisons } = useHistoricalRates(base, target, currentRate, initialRows)
  const sig = pairSignificantDigits(base, target)

  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-3">
      <h2 id="history-heading" className="text-lg font-semibold" style={{ ...SANS, color: PV.text }}>
        {t ? t.heading : <>{base}/{target} compared with earlier dates</>}
      </h2>
      <p className="text-sm" style={{ ...MONO, color: PV.dim }}>
        {t ? t.now(currentLabel, currentDate) : <>Now: {currentLabel ?? "—"}{currentDate ? ` (ECB reference rate of ${currentDate})` : ""}</>}
      </p>
      {/* relative: absolutely positioned descendants (sr-only text) stay inside the scroller */}
      <div className="relative overflow-x-auto rounded-xl" style={{ border: `1px solid ${PV.border}` }}>
        <table className="w-full min-w-[480px] text-sm" style={{ background: PV.surface }}>
          <thead>
            {/* Header text in `dim`, not `faint`: with border-collapse the row's 1px
                line is drawn inside each <th> box. faint is 5.48:1 on the surface but
                4.35:1 on that line; dim is 6.97:1 and 5.53:1 (pilot-ui.test.ts). */}
            <tr className="text-xs uppercase tracking-wider" style={{ color: PV.dim, borderBottom: `1px solid ${PV.border}` }}>
              <th scope="col" className="text-left font-normal py-3 px-4">{t ? t.columns[0] : "Period"}</th>
              <th scope="col" className="text-right font-normal py-3 px-4">{t ? t.columns[1] : "Then"}</th>
              <th scope="col" className="text-right font-normal py-3 px-4">{t ? t.columns[2] : "Used day"}</th>
              <th scope="col" className="text-right font-normal py-3 px-4">{t ? t.columns[3] : "Change"}</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c) => (
              <tr key={c.period.key} style={{ borderBottom: `1px solid ${PV.border}` }}>
                <th scope="row" className="text-left font-normal py-3 px-4 whitespace-nowrap" style={{ color: PV.text }}>
                  {t ? t.period(c.period.key) : c.period.label}
                  {c.coverageStart && (
                    <span className="block text-xs" style={{ color: PV.up }}>{t ? t.coverage(c.coverageStart) : <>data only from {c.coverageStart}</>}</span>
                  )}
                </th>
                <td className="text-right py-3 px-4" style={{ ...MONO, color: PV.text }}>
                  {c.historicalRate !== null ? (t ? t.rate(formatFxRate(c.historicalRate, sig)) : formatFxRate(c.historicalRate, sig)) : "—"}
                </td>
                <td className="text-right py-3 px-4" style={{ ...MONO, color: PV.dim }}>
                  {t && c.historicalDate ? t.day(c.historicalDate) : (c.historicalDate ?? "—")}
                  {c.historicalDate && c.historicalDate !== c.requestedDate && (
                    <span className="block text-xs" style={{ color: PV.faint }}>{t ? t.requested(c.requestedDate) : <>for {c.requestedDate}</>}</span>
                  )}
                </td>
                <td className="text-right py-3 px-4">
                  <Direction value={c.percentChange} locale={t ? "tr" : "en"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm" style={{ color: PV.dim }}>{t ? t.direction : directionNote(base, target)}</p>
      <p className="text-xs" style={{ color: PV.faint }}>
        {t ? t.footnote : (
          <>
            Then is the daily ECB reference rate on the last business day on or before the start of the period (not an
            intraday level); &ldquo;for&rdquo; shows the date that was asked for when it fell on a weekend or holiday.
          </>
        )}
      </p>
    </section>
  )
}
