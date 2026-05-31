"use client"

import { ResponsiveContainer, LineChart, Line } from "recharts"
import type { HistoricalPoint } from "@/lib/types"

interface SparklineProps {
  data: HistoricalPoint[]
  positive: boolean
}

export function Sparkline({ data, positive }: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className="w-28 h-10 rounded bg-white/5 animate-pulse" />
  }

  const color = positive ? "#10b981" : "#ef4444"

  return (
    <div className="w-28 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="rate"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
