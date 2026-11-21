import { PV, MONO } from "./palette"
import { directionOf } from "@/lib/chart"
import { trPercent } from "@/lib/format-tr"
import type { Locale } from "@/lib/i18n"

const KIND_TR = { up: "yükseliş", down: "düşüş", unchanged: "değişmedi" } as const

// Direction of a change: sign + ▲/▼ arrow. Colour is amber (up) / teal (down)
// and carries no good/bad meaning. A change that rounds to 0.00% has no
// direction to show: no arrow, no sign, neutral colour. Turkish pages
// (locale "tr"): "+%60,07" and a Turkish word for screen readers.
export function Direction({ value, className = "", locale = "en" }: { value: number | null; className?: string; locale?: Locale }) {
  if (value === null || !Number.isFinite(value)) {
    return <span style={{ ...MONO, color: PV.faint }} className={className}>—</span>
  }
  const d = directionOf(value)
  const color = d.kind === "unchanged" ? PV.dim : d.kind === "up" ? PV.up : PV.down
  return (
    <span style={{ ...MONO, color }} className={`relative inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      {d.arrow && <span aria-hidden="true" className="text-[0.7em]">{d.arrow}</span>}
      <span>{locale === "tr" ? trPercent(d.text) : d.text}</span>
      <span className="sr-only">{locale === "tr" ? KIND_TR[d.kind] : d.kind}</span>
    </span>
  )
}
