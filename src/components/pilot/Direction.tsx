import { PV, MONO } from "./palette"
import { signedPercent } from "@/lib/chart"

// Direction of a change: sign + ▲/▼ arrow. Colour is amber (up) / teal (down)
// and carries no good/bad meaning.
export function Direction({ value, className = "" }: { value: number | null; className?: string }) {
  if (value === null || !Number.isFinite(value)) {
    return <span style={{ ...MONO, color: PV.faint }} className={className}>—</span>
  }
  const up = value > 0
  const flat = value === 0
  const color = flat ? PV.dim : up ? PV.up : PV.down
  const arrow = flat ? "■" : up ? "▲" : "▼"
  return (
    <span style={{ ...MONO, color }} className={`relative inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      <span aria-hidden="true" className="text-[0.7em]">{arrow}</span>
      <span>{signedPercent(value)}</span>
      <span className="sr-only">{flat ? "unchanged" : up ? "up" : "down"}</span>
    </span>
  )
}
