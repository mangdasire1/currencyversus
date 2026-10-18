import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatPercentChange, PERCENT_EPSILON } from "@/lib/format"

interface PercentChangeProps {
  value: number | null
}

export function PercentChange({ value }: PercentChangeProps) {
  if (value === null) {
    return <span className="text-slate-500 text-sm font-mono">—</span>
  }

  if (Math.abs(value) < PERCENT_EPSILON) {
    return (
      <span
        className="inline-flex items-center gap-1 text-sm font-mono text-slate-400"
        title={`${value.toFixed(4)}%`}
      >
        <Minus className="w-3 h-3" />
        {formatPercentChange(value)}
      </span>
    )
  }

  const positive = value > 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-mono font-semibold px-2 py-0.5 rounded-md ${
        positive
          ? "text-emerald-400 bg-emerald-400/10 positive-change"
          : "text-red-400 bg-red-400/10 negative-change"
      }`}
    >
      {positive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {formatPercentChange(value)}
    </span>
  )
}
