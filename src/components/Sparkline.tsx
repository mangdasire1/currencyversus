"use client"

import { LineChart, Line, YAxis } from "recharts"
import { sparklineIsUp } from "@/lib/history"
import type { HistoricalPoint } from "@/lib/types"

// Fixed pixel size: a sparkline never needs ResponsiveContainer, whose
// measurement pass reports width/height -1 inside table cells.
const WIDTH = 112
const HEIGHT = 40

interface SparklineProps {
  data: HistoricalPoint[]
  // Accessible description, e.g. "USD/TRY, last 10 years, +212.35%". The
  // chart carries information, so it gets an SVG <title> rather than being
  // hidden as decoration.
  title: string
}

export function Sparkline({ data, title }: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className="rounded bg-white/5 animate-pulse" style={{ width: WIDTH, height: HEIGHT }} />
  }

  // Colour comes from the drawn line's own first/last point.
  const color = sparklineIsUp(data) ? "#10b981" : "#ef4444"

  return (
    <LineChart
      width={WIDTH}
      height={HEIGHT}
      data={data}
      margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
      title={title}
      role="img"
      accessibilityLayer={false}
    >
      {/* Scale to the series' own range; the default axis starts at 0, which
          flattens a rate moving between e.g. 0.85 and 0.90 into a straight line. */}
      <YAxis hide domain={["dataMin", "dataMax"]} />
      <Line
        type="monotone"
        dataKey="rate"
        stroke={color}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  )
}
