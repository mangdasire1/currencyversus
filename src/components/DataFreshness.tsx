import { RefreshCw } from "lucide-react"
import type { ConversionResult } from "@/lib/conversion"
import { formatUtcTime } from "@/lib/utils"
import { formatAge } from "@/lib/format"

// Shows where each number came from and how old it is. When a metal price is
// combined with an FX rate both timestamps are shown: they come from two
// sources that update on different schedules.
export function DataFreshness({ conv }: { conv: ConversionResult }) {
  const usesMetal = conv.baseUnit !== "currency" || conv.quoteUnit !== "currency"
  const metalTime = formatUtcTime(conv.metalPriceTime)
  const lines: string[] = []

  if (usesMetal && conv.base !== conv.quote) {
    lines.push(`Metal price: ${metalTime ?? "time not provided"} · gold-api.com`)
  }
  if (conv.fxDate) {
    lines.push(`Exchange rate: ECB reference rate of ${conv.fxDate} (published business days ~16:00 CET)`)
  }
  const checked = formatUtcTime(conv.fetchedAt)
  if (checked && lines.length > 0) {
    lines.push(`Last checked: ${checked}`)
  }

  if (lines.length === 0 && conv.status !== "stale") return null

  return (
    <div className="flex flex-col gap-0.5 mt-1 text-xs text-slate-500 font-mono">
      {conv.status === "stale" && (
        <span className="flex items-center gap-1 text-amber-400">
          <RefreshCw className="w-3 h-3" />
          Showing cached data{conv.staleAgeMs !== null ? ` (${formatAge(conv.staleAgeMs)})` : ""}
        </span>
      )}
      {lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  )
}
