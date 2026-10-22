"use client"

import { useState } from "react"
import type { ChartPeriod } from "@/lib/history"
import { DEFAULT_CHART_PERIOD, observationSentence } from "@/lib/history"
import { chartGeometry, chartAriaLabel, DEFAULT_CHART_BOX } from "@/lib/chart"
import { formatRateValue } from "@/lib/format"
import { usedDayNote } from "@/lib/pilot-format"
import { Direction } from "./Direction"
import { PV, MONO, SANS } from "./palette"

const BOX = DEFAULT_CHART_BOX

// One chart, seven period tabs. The default period is rendered on the server
// (the SVG path is computed from embedded data, no client measuring), and the
// plot area has a fixed height so hydration does not shift the page.
export function PairChart({ base, target, periods }: { base: string; target: string; periods: ChartPeriod[] }) {
  const [selected, setSelected] = useState(DEFAULT_CHART_PERIOD)
  const period = periods.find((p) => p.key === selected) ?? periods[periods.length - 1]
  const g = chartGeometry(period.points, BOX)
  const first = period.points[0]
  const last = period.points.at(-1)
  const shiftNote = period.start ? usedDayNote(period.requestedStart, period.start.date) : null

  return (
    <section aria-labelledby="chart-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="chart-heading" className="text-lg font-semibold" style={{ ...SANS, color: PV.text }}>
          {base} to {target} over time
        </h2>
      </div>

      {/* Tabs scroll sideways on narrow screens instead of wrapping or shrinking */}
      <div className="relative -mx-1 overflow-x-auto" role="group" aria-label="Chart period">
        <div className="flex gap-1.5 px-1 w-max">
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={p.key === period.key}
              onClick={() => setSelected(p.key)}
              className="min-w-[44px] min-h-[44px] px-3 rounded-lg text-sm"
              style={{
                ...MONO,
                background: p.key === period.key ? PV.accentFill : PV.raised,
                color: p.key === period.key ? "#FFFFFF" : PV.dim,
                border: `1px solid ${p.key === period.key ? PV.accentFill : PV.border}`,
              }}
            >
              {p.short}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-3 sm:p-4" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
        {/* Fixed-height plot: series high top-left, low bottom-left, period ends below */}
        <div className="relative" style={{ height: BOX.height }}>
          <svg
            role="img"
            aria-label={chartAriaLabel(base, target, period)}
            viewBox={`0 0 ${BOX.width} ${BOX.height}`}
            preserveAspectRatio="none"
            width="100%"
            height={BOX.height}
            className="block"
          >
            <line x1="0" x2={BOX.width} y1={BOX.padTop} y2={BOX.padTop} stroke={PV.border} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2={BOX.width} y1={BOX.height - BOX.padBottom} y2={BOX.height - BOX.padBottom} stroke={PV.border} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <path d={g.path} fill="none" stroke={PV.accentText} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute left-1 top-0 -translate-y-1/2 px-1 text-xs" style={{ ...MONO, color: PV.dim, background: PV.surface }}>
            {formatRateValue(g.domain[1])}
          </span>
          <span className="absolute left-1 bottom-0 translate-y-1/2 px-1 text-xs" style={{ ...MONO, color: PV.dim, background: PV.surface }}>
            {formatRateValue(g.domain[0])}
          </span>
        </div>
        <div className="mt-3 flex justify-between text-xs" style={{ ...MONO, color: PV.faint }}>
          <span>{first?.date ?? "—"}</span>
          <span>{last?.date ?? "—"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>Change</p>
          <p className="mt-1 text-xl"><Direction value={period.changePct} /></p>
          <p className="mt-1 text-xs" style={{ ...MONO, color: PV.dim }}>
            {period.start && period.end
              ? `${formatRateValue(period.start.rate)} → ${formatRateValue(period.end.rate)}`
              : period.coverageStart
                ? `Data only from ${period.coverageStart}`
                : "—"}
          </p>
        </div>
        {(
          [
            ["Low", period.low],
            ["High", period.high],
          ] as const
        ).map(([label, point]) => (
          <div key={label} className="rounded-xl p-4" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>{label}</p>
            <p className="mt-1 text-xl" style={{ ...MONO, color: PV.text }}>{point ? formatRateValue(point.rate) : "—"}</p>
            <p className="mt-1 text-xs" style={{ ...MONO, color: PV.dim }}>{point?.date ?? ""}</p>
          </div>
        ))}
      </div>

      <p className="text-sm" style={{ color: PV.dim }}>
        {observationSentence(period)}
        {shiftNote && <> {shiftNote}</>}
      </p>
    </section>
  )
}
