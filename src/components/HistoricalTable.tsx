"use client"

import { useHistoricalRates } from "@/hooks/useHistoricalRates"
import { PercentChange } from "./PercentChange"
import { Sparkline } from "./Sparkline"
import { SkeletonTableRow } from "./SkeletonLoaders"
import { CURRENCY_MAP } from "@/lib/currencies"
import { formatRate } from "@/lib/utils"
import { TIME_PERIODS } from "@/lib/currencies"

interface HistoricalTableProps {
  base: string
  target: string
  currentRate: number | null
}

export function HistoricalTable({ base, target, currentRate }: HistoricalTableProps) {
  const { comparisons, loading } = useHistoricalRates(base, target, currentRate)
  const targetCurrency = CURRENCY_MAP[target]

  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold text-white"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Historical Comparison
        </h2>
        <span className="text-xs text-slate-500 font-mono">
          {base} / {target}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs font-mono uppercase tracking-wider border-b border-white/5">
              <th className="text-left py-2 pr-4">Period</th>
              <th className="text-right py-2 px-4">Then</th>
              <th className="text-right py-2 px-4">Now</th>
              <th className="text-right py-2 px-4">Change</th>
              <th className="text-right py-2 pl-4">Trend</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? TIME_PERIODS.map((p) => <SkeletonTableRowTr key={p.key} />)
              : comparisons.map((c) => (
                  <tr
                    key={c.period.key}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors"
                  >
                    <td className="py-3 pr-4 text-slate-300 font-mono text-xs whitespace-nowrap">
                      {c.period.label}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-xs">
                      {c.historicalRate !== null && targetCurrency
                        ? formatRate(c.historicalRate, targetCurrency)
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-mono text-xs font-semibold">
                      {c.currentRate !== null && targetCurrency
                        ? formatRate(c.currentRate, targetCurrency)
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <PercentChange value={c.percentChange} />
                    </td>
                    <td className="py-3 pl-4 flex justify-end">
                      <Sparkline
                        data={c.sparklineData}
                        positive={(c.percentChange ?? 0) >= 0}
                      />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600 font-mono">
        Source: European Central Bank via Frankfurter API
      </p>
    </div>
  )
}

function SkeletonTableRowTr() {
  return (
    <tr className="border-b border-white/5">
      <td colSpan={5} className="py-2">
        <SkeletonTableRow />
      </td>
    </tr>
  )
}
