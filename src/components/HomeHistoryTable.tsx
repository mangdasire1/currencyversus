"use client"

import { useHistoricalRates } from "@/hooks/useHistoricalRates"
import { Sparkline } from "./Sparkline"
import { SkeletonTableRow } from "./SkeletonLoaders"
import { Direction } from "./pilot/Direction"
import { SavedDataNote } from "./SavedDataNote"
import { PV } from "./pilot/palette"
import { formatFxRate, formatPercentChange } from "@/lib/format"
import { pairSignificantDigits } from "@/lib/ecb"
import { TIME_PERIODS } from "@/lib/currencies"
import type { PeriodHistory } from "@/lib/history"
import type { TimePeriod } from "@/lib/types"

interface HomeHistoryTableProps {
  base: string
  target: string
  currentRate: number | null // for this pair only (the caller checks pair identity)
  currentLabel: string | null // "1 USD = 0.89566 EUR"
  currentDate: string | null // ECB date of the current rate
  initialRows?: PeriodHistory<TimePeriod>[] | null // build-time history (default pair)
}

// Home page historical table. The decisions made for the pair pages in
// Phase 7 apply here too:
// - the current rate is stated once above the table, not repeated on every
//   row (the old "Now" column showed the same number seven times);
// - a change is shown as sign + ▲/▼ in amber (up) / teal (down), never in
//   judging colours, because a rising rate is good for some readers and bad
//   for others. A change that rounds to 0.00% has no arrow and no sign.
export function HomeHistoryTable({ base, target, currentRate, currentLabel, currentDate, initialRows }: HomeHistoryTableProps) {
  const { comparisons, loading, stale, staleAgeMs } = useHistoricalRates(base, target, currentRate, initialRows)
  const sig = pairSignificantDigits(base, target)

  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white font-heading">
          Historical Comparison
        </h2>
        <span className="text-xs text-slate-500 font-mono">
          {base} / {target}
        </span>
      </div>

      <p className="text-sm text-slate-300 font-mono">
        Now: {currentLabel ?? "—"}
        {currentDate ? <span className="text-slate-500"> (ECB reference rate of {currentDate})</span> : null}
      </p>
      {/* the rows below are saved ones: the request for newer ones failed */}
      {stale && (
        <p className="text-sm">
          <SavedDataNote ageMs={staleAgeMs} />
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs font-mono uppercase tracking-wider border-b border-white/5">
              <th className="text-left py-2 pr-4">Period</th>
              <th className="text-right py-2 px-4">Then</th>
              <th className="text-right py-2 px-4">Change</th>
              <th className="text-right py-2 px-4">Low</th>
              <th className="text-right py-2 px-4">High</th>
              <th className="text-right py-2 pl-4">Trend</th>
            </tr>
          </thead>
          <tbody>
            {/* Row by row: each period renders as soon as its own data exists. */}
            {TIME_PERIODS.map((p) => {
              const c = loading ? undefined : comparisons.find((x) => x.period.key === p.key)
              return !c ? (
                <tr key={p.key} className="border-b border-white/5">
                  <td colSpan={6} className="py-2">
                    <SkeletonTableRow />
                  </td>
                </tr>
              ) : (
                <tr key={c.period.key} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="py-3 pr-4 text-slate-300 font-mono text-xs whitespace-nowrap">
                    {c.period.label}
                    {c.coverageStart && (
                      // The series does not reach back that far: say how far it goes.
                      <div className="text-[10px] text-amber-400">data only from {c.coverageStart}</div>
                    )}
                  </td>
                  <td
                    className="py-3 px-4 text-right text-slate-400 font-mono text-xs"
                    title={[
                      c.historicalRate !== null ? `Rate ${c.historicalRate}` : null,
                      c.historicalDate && c.historicalDate !== c.requestedDate
                        ? `Requested ${c.requestedDate}; nearest ECB business day ${c.historicalDate}`
                        : null,
                    ].filter(Boolean).join(" · ") || undefined}
                  >
                    {c.historicalRate !== null ? formatFxRate(c.historicalRate, sig) : "—"}
                    {c.historicalDate && <div className="text-[10px] text-slate-600">{c.historicalDate}</div>}
                  </td>
                  <td className="py-3 px-4 text-right text-sm">
                    <Direction value={c.percentChange} />
                  </td>
                  {[c.low, c.high].map((point, i) => (
                    <td
                      key={i === 0 ? "low" : "high"}
                      className="py-3 px-4 text-right text-slate-400 font-mono text-xs"
                      title={point ? `Daily ECB reference rate ${point.rate} on ${point.date}` : undefined}
                    >
                      {point ? formatFxRate(point.rate, sig) : "—"}
                      {point && <div className="text-[10px] text-slate-600">{point.date}</div>}
                    </td>
                  ))}
                  <td className="py-3 pl-4">
                    {/* Flex on the wrapper, not the <td>: a flex table cell breaks table layout. */}
                    <div className="flex justify-end">
                      <Sparkline
                        data={c.sparklineData}
                        title={`${base}/${target}, ${
                          c.coverageStart ? `since ${c.coverageStart}` : `last ${c.period.label.toLowerCase()}`
                        }, ${c.percentChange !== null ? formatPercentChange(c.percentChange) : "change unavailable"}`}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600 font-mono">
        Then, Low and High are daily ECB reference rates (one observation per business day, not
        intraday highs or lows); Then is the last business day on or before the start of the period.
        Change runs from Then to the current rate above. Trend lines plot daily (1 month), weekly
        (3 months–1 year) or monthly (3–10 years) observations, always keeping the first and last.
        Missing days are left out, not estimated. Source: European Central Bank via Frankfurter API
      </p>
    </div>
  )
}
