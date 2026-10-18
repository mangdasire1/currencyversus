import { test } from "node:test"
import assert from "node:assert/strict"
import { subtractMonths, toISODate, formatUtcTime } from "./utils.ts"

const d = (iso: string) => new Date(`${iso}T00:00:00Z`)
const sub = (iso: string, months: number) => toISODate(subtractMonths(d(iso), months))

test("31 March − 1 month → end of February", () => {
  console.log(`    2026-03-31 − 1 month = ${sub("2026-03-31", 1)}`)
  console.log(`    2024-03-31 − 1 month = ${sub("2024-03-31", 1)} (leap year)`)
  assert.equal(sub("2026-03-31", 1), "2026-02-28")
  assert.equal(sub("2024-03-31", 1), "2024-02-29")
})

test("month-end clamping across lengths and years", () => {
  assert.equal(sub("2026-05-31", 1), "2026-04-30")
  assert.equal(sub("2026-01-31", 2), "2025-11-30")
  assert.equal(sub("2026-10-18", 120), "2016-10-18")
  assert.equal(sub("2026-03-15", 1), "2026-02-15")
})

test("UTC policy: late-evening UTC time does not shift the calendar day", () => {
  const lateUtc = new Date("2026-03-31T23:30:00Z")
  assert.equal(toISODate(subtractMonths(lateUtc, 1)), "2026-02-28")
  const earlyUtc = new Date("2026-03-01T00:30:00Z")
  assert.equal(toISODate(subtractMonths(earlyUtc, 1)), "2026-02-01")
})

test("formatUtcTime", () => {
  assert.equal(formatUtcTime("2026-10-17T11:59:11Z"), "2026-10-17 11:59 UTC")
  assert.equal(formatUtcTime(null), null)
  assert.equal(formatUtcTime("garbage"), null)
})
