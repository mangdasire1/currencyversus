import { test } from "node:test"
import assert from "node:assert/strict"
import { samplePoints, sampleFrequencyFor, sparklineIsUp, derivePeriodHistory, loadPeriodHistory, seriesRange, seriesForTarget } from "./history.ts"
import { sharedRequest, requestStats } from "./inflight.ts"
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

// --- CV-13: one series request for all periods --------------------------------

const TODAY_SAT = new Date(Date.UTC(2026, 9, 18)) // Sat 2026-10-18

test("one series covers every period; 'Then' is the last business day ≤ requested date", () => {
  const { start, end } = seriesRange(TODAY_SAT, TIME_PERIODS)
  const series = businessDays(start, end)
  const rows = derivePeriodHistory(series, TODAY_SAT, TIME_PERIODS)
  for (const r of rows) {
    assert.ok(r.historicalDate !== null && r.historicalRate !== null, r.period.key)
    assert.ok(r.historicalDate! <= r.requestedDate, r.period.key)
    const gapDays = (Date.parse(r.requestedDate) - Date.parse(r.historicalDate!)) / 864e5
    assert.ok(gapDays <= 3, `${r.period.key} gap ${gapDays}`)
    assert.equal(r.sparklineData[0].date, r.historicalDate, `${r.period.key} line starts at Then`)
    assert.equal(r.sparklineData.at(-1)!.date, series.at(-1)!.date, `${r.period.key} line ends at last day`)
  }
  const tenY = rows.find((r) => r.period.key === "10y")!
  console.log(`    series ${start}..${end} (${series.length} pts); 10y requested ${tenY.requestedDate} → Then ${tenY.historicalDate}`)
})

test("request count: 14 sequential requests before → 1 now", async () => {
  let calls = 0
  const fetchSeries = async (start: string, end: string) => {
    calls++
    return businessDays(start, end)
  }
  const rows = await loadPeriodHistory(TODAY_SAT, TIME_PERIODS, fetchSeries)
  const before = TIME_PERIODS.length * 2 // old hook: historical-rate + time-series per period
  console.log(`    history requests per empty-cache table load: before=${before}, after=${calls}`)
  assert.equal(rows.length, TIME_PERIODS.length)
  assert.equal(calls, 1)
})

test("in-flight dedup: concurrent identical requests share one fetch", async () => {
  const startedBefore = requestStats.started
  let underlying = 0
  const run = () => { underlying++; return new Promise<number>((r) => setTimeout(() => r(42), 10)) }
  const [a, b, c] = await Promise.all([
    sharedRequest("k1", run), sharedRequest("k1", run), sharedRequest("k1", run),
  ])
  assert.deepEqual([a, b, c], [42, 42, 42])
  assert.equal(underlying, 1)
  assert.equal(requestStats.started - startedBefore, 1)
  // After settling, a new call starts a new request.
  await sharedRequest("k1", run)
  assert.equal(underlying, 2)
})

test("in-flight dedup: one caller aborting does not cancel the others; all aborting does", async () => {
  let sawAbort = false
  const run = (signal: AbortSignal) => new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => resolve("ok"), 20)
    signal.addEventListener("abort", () => { sawAbort = true; clearTimeout(t); reject(new Error("aborted")) })
  })
  const c1 = new AbortController()
  const p1 = sharedRequest("k2", run, c1.signal)
  const p2 = sharedRequest("k2", run)
  c1.abort()
  await assert.rejects(p1, { name: "AbortError" })
  assert.equal(await p2, "ok")
  assert.equal(sawAbort, false)

  const c3 = new AbortController(), c4 = new AbortController()
  const p3 = sharedRequest("k3", run, c3.signal)
  const p4 = sharedRequest("k3", run, c4.signal)
  c3.abort(); c4.abort()
  await assert.rejects(p3, { name: "AbortError" })
  await assert.rejects(p4, { name: "AbortError" })
  assert.equal(sawAbort, true)
})

// --- Phase 5: server-embedded history (same derivation as the client) ------

test("low/high are the extreme daily observations inside each period, with their dates", () => {
  const today = new Date(Date.UTC(2026, 9, 21))
  const series: HistoricalPoint[] = [
    { date: "2026-09-18", rate: 1.0 }, // before the 1m window (Then candidate is 2026-09-21)
    { date: "2026-09-21", rate: 1.1 },
    { date: "2026-09-30", rate: 0.9 }, // low
    { date: "2026-10-10", rate: 1.4 }, // high
    { date: "2026-10-21", rate: 1.2 },
  ]
  const [m1] = derivePeriodHistory(series, today, [{ key: "1m", label: "1 Month", months: 1 }])
  assert.equal(m1.historicalDate, "2026-09-21")
  assert.deepEqual(m1.low, { date: "2026-09-30", rate: 0.9 })
  assert.deepEqual(m1.high, { date: "2026-10-10", rate: 1.4 })
  assert.equal(m1.coverageStart, null)
})

test("weekend start: 'Then' is the provider's last business day before it, shown as that date", () => {
  // 2023-10-22 is a Sunday; the series has Friday 2023-10-20.
  const today = new Date(Date.UTC(2026, 9, 22))
  const series = [{ date: "2023-10-19", rate: 27.9 }, { date: "2023-10-20", rate: 28.02 }, { date: "2023-10-23", rate: 28.1 }, { date: "2026-10-21", rate: 49.6 }]
  const [y3] = derivePeriodHistory(series, today, [{ key: "3y", label: "3 Years", months: 36 }])
  assert.equal(y3.requestedDate, "2023-10-22")
  assert.equal(y3.historicalDate, "2023-10-20")
  assert.equal(y3.historicalRate, 28.02)
})

test("short coverage: no 'Then', no invented value, coverageStart says how far the data goes", () => {
  const today = new Date(Date.UTC(2026, 9, 21))
  const series = [{ date: "2018-03-01", rate: 2 }, { date: "2020-01-02", rate: 3 }, { date: "2026-10-21", rate: 5 }]
  const [y10] = derivePeriodHistory(series, today, [{ key: "10y", label: "10 Years", months: 120 }])
  assert.equal(y10.historicalRate, null)
  assert.equal(y10.historicalDate, null)
  assert.equal(y10.coverageStart, "2018-03-01")
  assert.deepEqual(y10.low, { date: "2018-03-01", rate: 2 })
  console.log(`    10y row with data only from ${y10.coverageStart}: Then=${y10.historicalRate}, low=${y10.low?.rate}, high=${y10.high?.rate}`)
})

test("seriesForTarget: picks one symbol out of a multi-symbol response, skips gaps, never fills", () => {
  const rates = {
    "2026-10-20": { EUR: 0.86, TRY: 49.5 },
    "2026-10-16": { EUR: 0.85 }, // no TRY that day → left out
    "2026-10-21": { EUR: 0.87, TRY: 49.6 },
  }
  assert.deepEqual(seriesForTarget(rates, "TRY"), [
    { date: "2026-10-20", rate: 49.5 },
    { date: "2026-10-21", rate: 49.6 },
  ])
  assert.equal(seriesForTarget(rates, "EUR").length, 3)
})
