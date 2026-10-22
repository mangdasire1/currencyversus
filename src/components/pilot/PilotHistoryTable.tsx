"use client"

import { useHistoricalRates } from "@/hooks/useHistoricalRates"
import { formatRateValue } from "@/lib/format"
import { directionNote } from "@/lib/pilot-format"
import type { PeriodHistory } from "@/lib/history"
import type { TimePeriod } from "@/lib/types"
import { Direction } from "./Direction"
import { PV, MONO, SANS } from "./palette"

interface PilotHistoryTableProps {
  base: string
  target: string
  currentRate: number | null
  currentLabel: string | null // "1 USD = 49.6280 TRY"
  currentDate: string | null
  initialRows: PeriodHistory<TimePeriod>[] | null
}

// Period | Then | Used day | Change. The current rate is stated once above
// the table instead of repeating it on all seven rows.
export function PilotHistoryTable({ base, target, currentRate, currentLabel, currentDate, initialRows }: PilotHistoryTableProps) {
  const { comparisons } = useHistoricalRates(base, target, currentRate, initialRows)

  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-3">
      <h2 id="history-heading" className="text-lg font-semibold" style={{ ...SANS, color: PV.text }}>
        {base}/{target} compared with earlier dates
      </h2>
      <p className="text-sm" style={{ ...MONO, color: PV.dim }}>
        Now: {currentLabel ?? "—"}{currentDate ? ` (ECB reference rate of ${currentDate})` : ""}
      </p>
      {/* relative: absolutely positioned descendants (sr-only text) stay inside the scroller */}
      <div className="relative overflow-x-auto rounded-xl" style={{ border: `1px solid ${PV.border}` }}>
        <table className="w-full min-w-[480px] text-sm" style={{ background: PV.surface }}>
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ color: PV.faint, borderBottom: `1px solid ${PV.border}` }}>
              <th scope="col" className="text-left font-normal py-3 px-4">Period</th>
              <th scope="col" className="text-right font-normal py-3 px-4">Then</th>
              <th scope="col" className="text-right font-normal py-3 px-4">Used day</th>
              <th scope="col" className="text-right font-normal py-3 px-4">Change</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c) => (
              <tr key={c.period.key} style={{ borderBottom: `1px solid ${PV.border}` }}>
                <th scope="row" className="text-left font-normal py-3 px-4 whitespace-nowrap" style={{ color: PV.text }}>
                  {c.period.label}
                  {c.coverageStart && (
                    <span className="block text-xs" style={{ color: PV.up }}>data only from {c.coverageStart}</span>
                  )}
                </th>
                <td className="text-right py-3 px-4" style={{ ...MONO, color: PV.text }}>
                  {c.historicalRate !== null ? formatRateValue(c.historicalRate) : "—"}
                </td>
                <td className="text-right py-3 px-4" style={{ ...MONO, color: PV.dim }}>
                  {c.historicalDate ?? "—"}
                  {c.historicalDate && c.historicalDate !== c.requestedDate && (
                    <span className="block text-xs" style={{ color: PV.faint }}>for {c.requestedDate}</span>
                  )}
                </td>
                <td className="text-right py-3 px-4">
                  <Direction value={c.percentChange} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm" style={{ color: PV.dim }}>{directionNote(base, target)}</p>
      <p className="text-xs" style={{ color: PV.faint }}>
        Then is the daily ECB reference rate on the last business day on or before the start of the period (not an
        intraday level); &ldquo;for&rdquo; shows the date that was asked for when it fell on a weekend or holiday.
      </p>
    </section>
  )
}
