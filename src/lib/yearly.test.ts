// Yearly figures: checked against an independent computation on real ECB
// data (no site function, no site formatter), plus the rules the pages rely on.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  seriesSpans, spanSizeWarning, loadFullEuroSeries, yearlyRows, yearLabelEn, yearLabelTr,
  trDative, trAblative, SPAN_WARN_BYTES, ECB_FIRST_DAY,
} from "./yearly.ts"
import type { DailyEuroRates, SpanRange } from "./yearly.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
// ECB euro rates for USD and TRY, 2018-11-30 … 2020-01-10, as the provider answered.
const real = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "ecb-usd-try-2019.json"), "utf8")) as { base: string; rates: DailyEuroRates }
const close = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= Math.abs(b) * 1e-12, `${what}: ${a} vs ${b}`)

test("yearly: USD/TRY 2019 against an independent computation on the raw ECB series", () => {
  // independent: plain loops over the provider's euro rates, TRY leg / USD leg
  const days = Object.keys(real.rates).filter((d) => d.startsWith("2019-")).sort()
  assert.equal(days.length, 255)
  let sum = 0, lo = Infinity, loDate = "", hi = -Infinity, hiDate = ""
  for (const d of days) {
    const r = real.rates[d].TRY / real.rates[d].USD
    sum += r
    if (r < lo) { lo = r; loDate = d }
    if (r > hi) { hi = r; hiDate = d }
  }
  const row = yearlyRows(real.rates, "USD", "TRY", new Date("2026-11-25T12:00:00Z")).find((r) => r.year === 2019)!
  // year end: 31 Dec 2019 was published; TRY 6.6843 and USD 1.1234 per euro
  assert.deepEqual(row.end.date, "2019-12-31")
  close(row.end.rate, 6.6843 / 1.1234, "year end")
  close(row.average, sum / 255, "average")
  assert.equal(row.days, 255)
  assert.deepEqual([row.low.date, row.high.date], [loDate, hiDate])
  close(row.low.rate, lo, "low")
  close(row.high.rate, hi, "high")
  // 2018's last publication day in the data: 31 Dec 2018
  assert.ok(real.rates["2018-12-31"])
  close(row.changePct!, ((6.6843 / 1.1234) / (real.rates["2018-12-31"].TRY / real.rates["2018-12-31"].USD) - 1) * 100, "change")
  // the inverse pair uses the same raw numbers
  const inv = yearlyRows(real.rates, "TRY", "USD", new Date("2026-11-25T12:00:00Z")).find((r) => r.year === 2019)!
  close(inv.end.rate, 1.1234 / 6.6843, "inverse year end")
  assert.equal(inv.low.date, hiDate)
  // as shown: 5 significant digits (USD 1.1234 and TRY 6.6843 carry 5 each)
  assert.equal(row.sig, 5)
  assert.equal(Number((6.6843 / 1.1234).toPrecision(row.sig)), 5.9501)
})

const day = (usd: number, tryRate: number) => ({ USD: usd, TRY: tryRate })

test("yearly: the year end is the year's last publication day, also when 31 December has none", () => {
  const euro: DailyEuroRates = {
    "2020-12-29": day(1.2, 9.1), "2020-12-30": day(1.2, 9.2), // 31 Dec 2020: no publication
    "2021-12-30": day(1.1, 15), "2021-12-31": day(1.1, 15.5),
  }
  const rows = yearlyRows(euro, "USD", "TRY", new Date("2026-01-10T00:00:00Z"))
  assert.equal(rows[0].end.date, "2020-12-30")
  assert.equal(rows[0].end.rate, 9.2 / 1.2)
  assert.equal(rows[1].end.date, "2021-12-31")
  assert.equal(rows[0].changePct, null, "first year: no change")
  close(rows[1].changePct!, ((15.5 / 1.1) / (9.2 / 1.2) - 1) * 100, "change vs previous year end")
})

test("yearly: the average is the mean of the daily cross rates, not a ratio of averages", () => {
  const euro: DailyEuroRates = { "2021-03-01": day(1, 2), "2021-03-02": day(2, 2) }
  const [row] = yearlyRows(euro, "USD", "TRY", new Date("2026-01-10T00:00:00Z"))
  assert.equal(row.average, 1.5) // (2/1 + 2/2) / 2
  assert.notEqual(row.average, (2 + 2) / 2 / ((1 + 2) / 2)) // 1.333…: ratio of the averages
})

test("yearly: the current year is labelled and runs to the last publication day", () => {
  const euro: DailyEuroRates = { "2025-12-31": day(1.1, 48), "2026-01-02": day(1.1, 48.5), "2026-11-20": day(1.16, 55.5) }
  const rows = yearlyRows(euro, "USD", "TRY", new Date("2026-11-25T09:00:00Z"))
  const now = rows.at(-1)!
  assert.equal(now.current, true)
  assert.equal(rows[0].current, false)
  assert.equal(now.end.date, "2026-11-20")
  assert.equal(yearLabelTr(now), "2026 (yıl başından 20.11.2026'ya)")
  assert.equal(yearLabelEn(now), "2026 (year to 20 Nov 2026)")
  assert.equal(yearLabelEn(rows[0]), "2025")
  assert.equal(yearLabelTr(rows[0]), "2025")
  close(now.changePct!, ((55.5 / 1.16) / (48 / 1.1) - 1) * 100, "change vs last year end")
})

test("yearly: a first year that starts after the year's first ECB publication is labelled", () => {
  // USD from the year's first day, TRY only from 1 July
  const euro: DailyEuroRates = {
    "2005-01-03": { USD: 1.35 }, "2005-07-01": day(1.2, 1.62), "2005-12-30": day(1.18, 1.59),
    "2006-01-02": day(1.18, 1.6), "2006-12-29": day(1.32, 1.86),
    // a later year whose first day lacks a leg: not a first year, not labelled
    "2007-01-02": { USD: 1.33 }, "2007-01-03": day(1.32, 1.87),
  }
  const rows = yearlyRows(euro, "USD", "TRY", new Date("2026-11-25T00:00:00Z"))
  assert.deepEqual(rows.map((r) => [r.year, r.partialStart, r.days]), [[2005, true, 2], [2006, false, 2], [2007, false, 1]])
  assert.equal(yearLabelTr(rows[0]), "2005 (01.07.2005'ten itibaren)")
  assert.equal(yearLabelEn(rows[0]), "2005 (from 1 Jul 2005)")
  assert.equal(yearLabelEn(rows[1]), "2006")
  // a pair whose data starts on the year's first publication day: a full year
  const full = yearlyRows(euro, "EUR", "USD", new Date("2026-11-25T00:00:00Z"))
  assert.equal(full[0].partialStart, false)
  assert.equal(full[0].first, "2005-01-03")
})

test("yearly: TRY starts with the ECB's own TRY rate (3 January 2005), not the provider's converted old-lira rates", () => {
  // the provider's answer: TRL per euro / 1,000,000 before 2005
  const euro: DailyEuroRates = {
    "1999-01-04": { USD: 1.1789, TRY: 0.372274, GBP: 0.7111 }, "2004-12-31": { USD: 1.3621, TRY: 1.8362, GBP: 0.70505 },
    "2005-01-03": { USD: 1.3507, TRY: 1.815, GBP: 0.70725 }, "2005-12-30": { USD: 1.1797, TRY: 1.5925, GBP: 0.6853 },
  }
  const at = new Date("2026-11-25T00:00:00Z")
  for (const [b, t] of [["USD", "TRY"], ["TRY", "USD"], ["EUR", "TRY"]]) {
    const rows = yearlyRows(euro, b, t, at)
    assert.deepEqual(rows.map((r) => [r.year, r.first, r.partialStart, r.changePct]), [[2005, "2005-01-03", false, null]], `${b}/${t}`)
  }
  // other pairs keep 1999
  assert.equal(yearlyRows(euro, "USD", "GBP", at)[0].year, 1999)
})

test("yearly: significant digits follow that year's euro legs", () => {
  // TRY per euro: 1.6771 (5 significant digits) in 2005, 35.879 (6) in 2024
  const euro: DailyEuroRates = { "2005-06-01": { TRY: 1.6771 }, "2024-06-03": { TRY: 35.879 } }
  const rows = yearlyRows(euro, "EUR", "TRY", new Date("2026-11-25T00:00:00Z"))
  assert.deepEqual(rows.map((r) => r.sig), [5, 6])
  // JPY 2 decimals: 129.6 → 5; GBP 5 decimals: 0.8379 → 5; the fewer of two legs wins
  const two = yearlyRows({ "2010-01-04": { JPY: 129.6, GBP: 0.8379, CHF: 1.4787 } }, "GBP", "JPY", new Date("2026-11-25T00:00:00Z"))
  assert.equal(two[0].sig, 5)
  assert.equal(yearlyRows({ "2010-01-04": { CHF: 0.9247 } }, "EUR", "CHF", new Date("2026-11-25T00:00:00Z"))[0].sig, 4)
})

test("Turkish case suffixes after a year", () => {
  const dat = Object.fromEntries([2000, 2005, 2006, 2009, 2010, 2020, 2026, 2030, 2040, 2060, 2070, 2100].map((y) => [y, trDative(y)]))
  assert.deepEqual(dat, { 2000: "e", 2005: "e", 2006: "ya", 2009: "a", 2010: "a", 2020: "ye", 2026: "ya", 2030: "a", 2040: "a", 2060: "a", 2070: "e", 2100: "e" })
  const abl = Object.fromEntries([1999, 2000, 2003, 2004, 2005, 2006, 2010, 2040, 2060, 2070].map((y) => [y, trAblative(y)]))
  assert.deepEqual(abl, { 1999: "dan", 2000: "den", 2003: "ten", 2004: "ten", 2005: "ten", 2006: "dan", 2010: "dan", 2040: "tan", 2060: "tan", 2070: "ten" })
})

test("spans: fixed lengths from 1999, contiguous, the last ends today; a new one starts on its own", () => {
  const at = (d: string) => seriesSpans(new Date(`${d}T12:00:00Z`))
  assert.deepEqual(at("2026-11-25"), [
    { start: ECB_FIRST_DAY, end: "2008-12-31" },
    { start: "2009-01-01", end: "2018-12-31" },
    { start: "2019-01-01", end: "2026-11-25" },
  ])
  assert.equal(at("2028-12-31").length, 3)
  assert.deepEqual(at("2029-01-01").at(-1), { start: "2029-01-01", end: "2029-01-01" })
  assert.deepEqual(at("2045-06-30").map((s) => s.start), [ECB_FIRST_DAY, "2009-01-01", "2019-01-01", "2029-01-01", "2039-01-01"])
  for (const d of ["2026-11-25", "2029-01-01", "2045-06-30"]) {
    const s = at(d)
    for (let i = 1; i < s.length; i++) {
      const next = new Date(`${s[i - 1].end}T00:00:00Z`)
      next.setUTCDate(next.getUTCDate() + 1)
      assert.equal(s[i].start, next.toISOString().slice(0, 10), `${d}: spans touch`)
    }
    assert.equal(s.at(-1)!.end, d)
  }
})

test("spans: an answer over 1.5 MB is reported at build time", async () => {
  const range = { start: "2009-01-01", end: "2018-12-31" }
  assert.equal(spanSizeWarning(range, SPAN_WARN_BYTES), null)
  assert.equal(SPAN_WARN_BYTES, 1.5 * 1024 * 1024)
  assert.match(spanSizeWarning(range, SPAN_WARN_BYTES + 1)!, /^WARNING: ECB series 2009-01-01\.\.2018-12-31 is 1\.50 MB, over 1\.50 MB/)
  // through the loader: only the big span warns, and the series is still merged
  const big = (r: SpanRange) => JSON.stringify({ base: "EUR", start_date: r.start, end_date: r.end, rates: { [r.end]: { USD: 1.1 } }, pad: "x".repeat(SPAN_WARN_BYTES) })
  const small = (r: SpanRange) => JSON.stringify({ base: "EUR", rates: { [r.start]: { USD: 1.2 }, [r.end]: { USD: 1.1 } } })
  const warned: string[] = []
  const euro = await loadFullEuroSeries(new Date("2026-11-25T12:00:00Z"), async (r) => (r.start === "2009-01-01" ? big(r) : small(r)), (m) => warned.push(m))
  assert.equal(warned.length, 1)
  assert.match(warned[0], /2009-01-01\.\.2018-12-31/)
  assert.deepEqual(Object.keys(euro).sort(), [ECB_FIRST_DAY, "2008-12-31", "2018-12-31", "2019-01-01", "2026-11-25"])
})

test("spans: a failed or wrong span stops the build", async () => {
  const ok = (r: SpanRange) => JSON.stringify({ base: "EUR", rates: { [r.end]: { USD: 1.1 } } })
  const today = new Date("2026-11-25T12:00:00Z")
  await assert.rejects(loadFullEuroSeries(today, async (r) => { if (r.start === "2009-01-01") throw new Error("HTTP 522"); return ok(r) }, () => {}), /HTTP 522/)
  await assert.rejects(loadFullEuroSeries(today, async (r) => (r.start === "2019-01-01" ? JSON.stringify({ base: "USD", rates: { x: {} } }) : ok(r)), () => {}), /expected euro reference rates/)
  await assert.rejects(loadFullEuroSeries(today, async (r) => (r.start === ECB_FIRST_DAY ? JSON.stringify({ base: "EUR", rates: {} }) : ok(r)), () => {}), /no days/)
  // the provider steps a span's start back to the previous business day: merged, not duplicated
  const euro = await loadFullEuroSeries(today, async (r) => JSON.stringify({ base: "EUR", rates: { "2018-12-31": { USD: 1.145 }, [r.end]: { USD: 1.1 } } }), () => {})
  assert.equal(Object.keys(euro).filter((d) => d === "2018-12-31").length, 1)
})

test("build data: the yearly rows come from every span, with the build's retry, and failures are not swallowed", () => {
  const src = fs.readFileSync(path.join(here, "build-data.ts"), "utf8")
  const part = src.slice(src.indexOf("let fullSeriesMemo"), src.indexOf("// New-layout pages"))
  assert.match(part, /loadFullEuroSeries\(new Date\(\), async \(range\) => \{/)
  assert.match(part, /fetchWithRetry\(`\$\{BASE_URL\}\/\$\{range\.start\}\.\.\$\{range\.end\}\?symbols=\$\{EUR_SYMBOLS\}`\)/)
  assert.match(part, /const rows = yearlyRows\(await fullEuroSeries\(\), base, target, new Date\(\)\)/)
  assert.match(part, /if \(rows\.length === 0\) throw new Error/)
  assert.match(part, /\.catch\(\(err\) => \{\s*fullSeriesMemo = null\s*throw err\s*\}\)/)
  assert.doesNotMatch(part, /return null/)
})
