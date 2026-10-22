// Geometry and text for the pilot pair chart. Pure — tested with `node --test`.
//
// The chart is a plain SVG path computed here, so the default period is in
// the server HTML (no client measuring pass) and the box has a fixed height
// (no layout shift on hydration).
//
// Y axis: the domain is always [dataMin, dataMax] of the drawn points. A
// domain starting at 0 flattens narrow-band series into a straight line —
// this bug happened once with the sparklines; chart.test.ts guards against it.

import type { HistoricalPoint } from "./types.ts"
import type { ChartPeriod } from "./history.ts"
import { formatRateValue } from "./format.ts"

export interface ChartBox {
  width: number
  height: number
  padTop: number
  padBottom: number
}

export const DEFAULT_CHART_BOX: ChartBox = { width: 720, height: 240, padTop: 12, padBottom: 12 }

export interface ChartGeometry {
  path: string
  domain: [number, number] // [dataMin, dataMax]
  vertices: Array<{ x: number; y: number }>
}

const r1 = (n: number) => Math.round(n * 10) / 10

export function chartGeometry(points: HistoricalPoint[], box: ChartBox = DEFAULT_CHART_BOX): ChartGeometry {
  if (points.length === 0) return { path: "", domain: [0, 0], vertices: [] }
  const rates = points.map((p) => p.rate)
  const min = Math.min(...rates)
  const max = Math.max(...rates)
  const t = points.map((p) => Date.parse(`${p.date}T00:00:00Z`))
  const t0 = t[0]
  const span = t[t.length - 1] - t0 || 1
  const plotH = box.height - box.padTop - box.padBottom
  const y = (rate: number) => (max === min ? box.padTop + plotH / 2 : box.padTop + ((max - rate) / (max - min)) * plotH)
  const vertices = points.map((p, i) => ({ x: r1(((t[i] - t0) / span) * box.width), y: r1(y(p.rate)) }))
  const path = vertices.map((v, i) => `${i === 0 ? "M" : "L"}${v.x},${v.y}`).join(" ")
  return { path, domain: [min, max], vertices }
}

function signedPercent(p: number): string {
  return `${p > 0 ? "+" : p < 0 ? "" : "±"}${p.toFixed(2)}%`
}

// "USD to TRY from 2016-10 to 2026-10, rising from 3.0798 to 49.6280, a change of +1511.40%"
export function chartAriaLabel(base: string, target: string, p: Pick<ChartPeriod, "points" | "changePct" | "start" | "end">): string {
  const first = p.points[0]
  const last = p.points.at(-1)
  if (!first || !last) return `${base} to ${target}: no data for this period`
  const from = p.start ?? first
  const to = p.end ?? last
  const direction = to.rate > from.rate ? "rising" : to.rate < from.rate ? "falling" : "unchanged"
  const change = p.changePct !== null ? `, a change of ${signedPercent(p.changePct)}` : ""
  return `${base} to ${target} from ${from.date.slice(0, 7)} to ${to.date.slice(0, 7)}, ${direction} from ${formatRateValue(from.rate)} to ${formatRateValue(to.rate)}${change}`
}

export { signedPercent }
