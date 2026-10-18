// Sparkline sampling. Pure — tested with `node --test`.
//
// Each period draws its own full range; only the sampling frequency changes
// with the range length so long periods stay light.

import type { HistoricalPoint } from "./types.ts"

export type SampleFrequency = "daily" | "weekly" | "monthly"

export function sampleFrequencyFor(months: number): SampleFrequency {
  if (months <= 1) return "daily"
  if (months <= 12) return "weekly"
  return "monthly"
}

// Monday of the ISO week, as YYYY-MM-DD (UTC).
function weekKey(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

function bucketKey(isoDate: string, freq: SampleFrequency): string {
  if (freq === "daily") return isoDate
  if (freq === "weekly") return weekKey(isoDate)
  return isoDate.slice(0, 7) // YYYY-MM
}

// Keeps the last observation of each calendar bucket. The first and last
// points of the input are always kept so the line spans the real range.
export function samplePoints(points: HistoricalPoint[], freq: SampleFrequency): HistoricalPoint[] {
  const sorted = points
    .filter((p) => Number.isFinite(p.rate))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length <= 2) return sorted

  const out: HistoricalPoint[] = []
  for (let i = 0; i < sorted.length; i++) {
    const next = sorted[i + 1]
    if (!next || bucketKey(next.date, freq) !== bucketKey(sorted[i].date, freq)) {
      out.push(sorted[i])
    }
  }
  if (out[0] !== sorted[0]) out.unshift(sorted[0])
  return out
}

// Direction of the drawn line itself, so its colour never contradicts its shape.
export function sparklineIsUp(points: HistoricalPoint[]): boolean {
  if (points.length < 2) return true
  return points[points.length - 1].rate >= points[0].rate
}
