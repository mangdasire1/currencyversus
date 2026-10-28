import { PV, MONO } from "./palette"
import { directionOf } from "@/lib/chart"

// Direction of a change: sign + ▲/▼ arrow. Colour is amber (up) / teal (down)
// and carries no good/bad meaning. A change that rounds to 0.00% has no
// direction to show: no arrow, no sign, neutral colour.
export function Direction({ value, className = "" }: { value: number | null; className?: string }) {
  if (value === null || !Number.isFinite(value)) {
    return <span style={{ ...MONO, color: PV.faint }} className={className}>—</span>
  }
  const d = directionOf(value)
  const color = d.kind === "unchanged" ? PV.dim : d.kind === "up" ? PV.up : PV.down
  return (
    <span style={{ ...MONO, color }} className={`relative inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      {d.arrow && <span aria-hidden="true" className="text-[0.7em]">{d.arrow}</span>}
      <span>{d.text}</span>
      <span className="sr-only">{d.kind}</span>
    </span>
  )
}
