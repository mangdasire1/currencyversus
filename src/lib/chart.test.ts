import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { deriveChartPeriods, CHART_PERIODS, observationSentence, seriesRange } from "./history.ts"
import { chartGeometry, chartAriaLabel, DEFAULT_CHART_BOX } from "./chart.ts"
import { toISODate } from "./utils.ts"
import type { HistoricalPoint } from "./types.ts"

// Business days only, with a deterministic wobbling rate.
function businessDays(start: string, end: string): HistoricalPoint[] {
  const out: HistoricalPoint[] = []
  const d = new Date(`${start}T00:00:00Z`)
  const stop = new Date(`${end}T00:00:00Z`)
  let i = 0
  while (d <= stop) {
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) out.push({ date: toISODate(d), rate: 10 + Math.sin(i / 7) * 2 + i * 0.001 + ((i * 7919) % 13) / 100 })
    i++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

const TODAY = new Date(Date.UTC(2026, 9, 22)) // Thu 2026-10-22
const { start, end } = seriesRange(TODAY, CHART_PERIODS)
const SERIES = businessDays(start, end)
const PERIODS = deriveChartPeriods(SERIES, TODAY)

test("embedded period summaries match values computed from the full daily series", () => {
  for (const p of PERIODS) {
    // brute force from the full series
    const startObs = [...SERIES].reverse().find((o) => o.date <= p.requestedStart)!
    const window = SERIES.filter((o) => o.date >= startObs.date)
    const low = window.reduce((a, b) => (b.rate < a.rate ? b : a))
    const high = window.reduce((a, b) => (b.rate > a.rate ? b : a))
    const last = SERIES.at(-1)!
    assert.deepEqual(p.start, startObs, `${p.key} start`)
    assert.deepEqual(p.end, last, `${p.key} end`)
    assert.deepEqual(p.low, low, `${p.key} low (daily)`)
    assert.deepEqual(p.high, high, `${p.key} high (daily)`)
    assert.ok(Math.abs(p.changePct! - ((last.rate - startObs.rate) / startObs.rate) * 100) < 1e-12, `${p.key} change`)
  }
})

test("low/high come from daily data even when the drawn line skips that day", () => {
  const ten = PERIODS.find((p) => p.key === "10y")!
  const dailyLowDay = ten.low!.date
  // the 10Y line is monthly: the extreme day is usually not one of its points
  assert.ok(ten.points.length < SERIES.length / 10)
  assert.ok(ten.low!.rate <= Math.min(...ten.points.map((p) => p.rate)))
  console.log(`    10Y: daily low ${ten.low!.rate.toFixed(4)} on ${dailyLowDay}; lowest drawn point ${Math.min(...ten.points.map((p) => p.rate)).toFixed(4)}`)
})

test("weekend start: shifted to the previous published business day and recorded", () => {
  // 2023-10-22 is a Sunday → Friday 2023-10-20
  const sundayToday = new Date(Date.UTC(2026, 9, 22))
  const series = businessDays("2023-10-01", "2026-10-22")
  const y3 = deriveChartPeriods(series, sundayToday, CHART_PERIODS.filter((p) => p.key === "3y"))[0]
  console.log(`    3Y: requested ${y3.requestedStart} → used ${y3.start!.date}, startShifted=${y3.startShifted}`)
  assert.equal(y3.requestedStart, "2023-10-22")
  assert.equal(y3.start!.date, "2023-10-20")
  assert.equal(y3.startShifted, true)
  // a weekday start is not shifted
  const m1 = deriveChartPeriods(series, sundayToday, CHART_PERIODS.filter((p) => p.key === "1m"))[0]
  assert.equal(m1.requestedStart, "2026-09-22")
  assert.equal(m1.startShifted, false)
})

test("observation count equals the number of drawn points (and path vertices)", () => {
  const counts: string[] = []
  for (const p of PERIODS) {
    assert.equal(p.observations, p.points.length, p.key)
    const g = chartGeometry(p.points)
    assert.equal(g.vertices.length, p.observations, `${p.key} vertices`)
    assert.equal((g.path.match(/[ML]/g) ?? []).length, p.observations, `${p.key} path commands`)
    assert.deepEqual(p.points[0], p.start, `${p.key} first point is the start`)
    assert.deepEqual(p.points.at(-1), p.end, `${p.key} last point is the end`)
    assert.match(observationSentence(p), new RegExp(`^The line uses ${p.observations} `))
    counts.push(`${p.short}=${p.observations}`)
  }
  console.log(`    drawn points per period: ${counts.join(" ")}`)
})

test("sampling sizes match the prototype table (±2)", () => {
  const expected: Record<string, number> = { "1m": 23, "3m": 34, "6m": 44, "1y": 52, "3y": 37, "5y": 61, "10y": 121 }
  for (const p of PERIODS) assert.ok(Math.abs(p.observations - expected[p.key]) <= 2, `${p.key}: ${p.observations} vs ~${expected[p.key]}`)
})

// --- Y axis regression guard (known pitfall 1) ----------------------------

test("Y axis: domain is [dataMin, dataMax], never anchored at 0", () => {
  const narrow = [
    { date: "2026-01-01", rate: 0.85 },
    { date: "2026-02-01", rate: 0.9 },
    { date: "2026-03-01", rate: 0.87 },
  ]
  const g = chartGeometry(narrow)
  assert.deepEqual(g.domain, [0.85, 0.9])
  const ys = g.vertices.map((v) => v.y)
  const plot = DEFAULT_CHART_BOX.height - DEFAULT_CHART_BOX.padTop - DEFAULT_CHART_BOX.padBottom
  const span = Math.max(...ys) - Math.min(...ys)
  console.log(`    narrow 0.85–0.90 series: domain [${g.domain}], vertical span ${span}px of ${plot}px`)
  assert.equal(span, plot) // highest point at the top, lowest at the bottom
})

test("Y axis: every Recharts chart in src declares YAxis domain [dataMin, dataMax]", () => {
  const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
  const files: string[] = []
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f)
      if (fs.statSync(p).isDirectory()) walk(p)
      else if (f.endsWith(".tsx")) files.push(p)
    }
  }
  walk(srcDir)
  const charts = files.filter((f) => /<(LineChart|AreaChart|BarChart|ComposedChart)\b/.test(fs.readFileSync(f, "utf8")))
  for (const f of charts) {
    const src = fs.readFileSync(f, "utf8")
    assert.match(src, /<YAxis\b[^>]*domain=\{\["dataMin", "dataMax"\]\}/, `${path.basename(f)}: chart without YAxis domain [dataMin, dataMax]`)
  }
  console.log(`    Recharts chart files checked: ${charts.map((f) => path.basename(f)).join(", ")}`)
})

test("aria-label carries the real numbers", () => {
  const p = {
    points: [{ date: "2016-10-21", rate: 3.0798 }, { date: "2026-10-22", rate: 49.628 }],
    start: { date: "2016-10-21", rate: 3.0798 },
    end: { date: "2026-10-22", rate: 49.628 },
    changePct: ((49.628 - 3.0798) / 3.0798) * 100,
  }
  assert.equal(chartAriaLabel("USD", "TRY", p), "USD to TRY from 2016-10 to 2026-10, rising from 3.0798 to 49.6280, a change of +1511.40%") // the brief's example text
})
