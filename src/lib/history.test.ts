import { test } from "node:test"
import assert from "node:assert/strict"
import { samplePoints, sampleFrequencyFor, sparklineIsUp } from "./history.ts"
import { TIME_PERIODS } from "./currencies.ts"
import { subtractMonths, toISODate } from "./utils.ts"
import type { HistoricalPoint } from "./types.ts"

// Synthetic ECB-like series: business days only, from start to end inclusive.
function businessDays(start: string, end: string): HistoricalPoint[] {
  const out: HistoricalPoint[] = []
  const d = new Date(`${start}T00:00:00Z`)
  const stop = new Date(`${end}T00:00:00Z`)
  let i = 0
  while (d <= stop) {
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) out.push({ date: toISODate(d), rate: 1 + i++ * 0.0001 })
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

const TODAY = new Date(Date.UTC(2026, 9, 16)) // Fri 2026-10-16, last ECB day

test("every period's sparkline spans its own range and keeps both endpoints", () => {
  for (const period of TIME_PERIODS) {
    const start = toISODate(subtractMonths(TODAY, period.months))
    const series = businessDays(start, toISODate(TODAY))
    const sampled = samplePoints(series, sampleFrequencyFor(period.months))
    assert.equal(sampled[0].date, series[0].date, `${period.key} first`)
    assert.equal(sampled.at(-1)!.date, series.at(-1)!.date, `${period.key} last`)
    const yearsBack = (TODAY.getTime() - Date.parse(sampled[0].date)) / (365.25 * 864e5)
    console.log(
      `    ${period.key.padEnd(3)} ${sampleFrequencyFor(period.months).padEnd(7)} points=${String(sampled.length).padStart(3)}  first=${sampled[0].date}  last=${sampled.at(-1)!.date}  span≈${yearsBack.toFixed(2)}y`
    )
  }
})

test("10y sparkline starts ~10 years ago (not 12 months)", () => {
  const start = toISODate(subtractMonths(TODAY, 120))
  const sampled = samplePoints(businessDays(start, toISODate(TODAY)), sampleFrequencyFor(120))
  const years = (TODAY.getTime() - Date.parse(sampled[0].date)) / (365.25 * 864e5)
  assert.ok(years > 9.9 && years < 10.1, `span ${years}`)
})

test("sampling never drops the last element (old i % step bug)", () => {
  // 45 business days: the old filter (step = floor(45/20) = 2, keep i % 2 === 0)
  // would keep index 44 by luck; 44 days would drop it. Check both lengths.
  for (const end of ["2026-03-04", "2026-03-03"]) {
    const series = businessDays("2026-01-01", end)
    for (const freq of ["daily", "weekly", "monthly"] as const) {
      const sampled = samplePoints(series, freq)
      assert.equal(sampled.at(-1)!.date, series.at(-1)!.date, `${end} ${freq}`)
      assert.equal(sampled[0].date, series[0].date, `${end} ${freq}`)
    }
  }
})

test("sparkline colour follows the drawn line's own endpoints", () => {
  assert.equal(sparklineIsUp([{ date: "a", rate: 1 }, { date: "b", rate: 2 }, { date: "c", rate: 1.5 }]), true)
  assert.equal(sparklineIsUp([{ date: "a", rate: 2 }, { date: "b", rate: 3 }, { date: "c", rate: 1.5 }]), false)
})
