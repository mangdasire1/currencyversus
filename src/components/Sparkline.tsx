import { sparklineIsUp } from "@/lib/history"
import { chartGeometry } from "@/lib/chart"
import type { ChartBox } from "@/lib/chart"
import { PV } from "./pilot/palette"
import type { HistoricalPoint } from "@/lib/types"

// Trend line of one table row on the home page. A plain SVG path from the
// same geometry as the pair pages' chart (src/lib/chart.ts chartGeometry), so
// it is in the server HTML and needs no charting library:
// - Y axis [dataMin, dataMax] of the drawn points, never anchored at 0 — a
//   rate moving between 0.85 and 0.90 still fills the box (chart.test.ts);
// - amber when the line ends higher than it starts, teal when lower — never
//   green/red (pilot-ui.test.ts);
// - fixed pixel size, so the table does not shift when it hydrates.
const BOX: ChartBox = { width: 112, height: 40, padTop: 3, padBottom: 3 }

interface SparklineProps {
  data: HistoricalPoint[]
  // Accessible description, e.g. "USD/TRY, last 10 years, +212.35%". The
  // line carries information, so it is an image with a <title>, not decoration.
  title: string
}

export function Sparkline({ data, title }: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className="rounded bg-white/5 animate-pulse" style={{ width: BOX.width, height: BOX.height }} />
  }
  const color = sparklineIsUp(data) ? PV.up : PV.down
  const { path } = chartGeometry(data, BOX)
  return (
    <svg role="img" aria-label={title} width={BOX.width} height={BOX.height} viewBox={`0 0 ${BOX.width} ${BOX.height}`} className="block overflow-visible">
      <title>{title}</title>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
