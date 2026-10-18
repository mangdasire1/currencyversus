import { test } from "node:test"
import assert from "node:assert/strict"
import { ecbHolidays, isEcbPublicationDay, missedEcbPublications, checkBuildInfo } from "./freshness.ts"
import type { BuildInfo } from "./freshness.ts"

const at = (s: string) => new Date(s)

test("TARGET holidays: Good Friday / Easter Monday computed per year", () => {
  assert.ok(ecbHolidays(2026).has("2026-04-03")) // Good Friday 2026
  assert.ok(ecbHolidays(2026).has("2026-04-06")) // Easter Monday 2026
  assert.ok(ecbHolidays(2027).has("2027-03-26")) // Good Friday 2027
  assert.equal(isEcbPublicationDay("2026-10-17"), false) // Saturday
  assert.equal(isEcbPublicationDay("2026-12-25"), false)
  assert.equal(isEcbPublicationDay("2026-10-16"), true)
})

test("weekend is not an alarm: Friday's rate on Sunday/Monday morning misses nothing", () => {
  assert.equal(missedEcbPublications("2026-10-16", at("2026-10-18T12:00:00Z")), 0) // Sunday
  assert.equal(missedEcbPublications("2026-10-16", at("2026-10-19T09:00:00Z")), 0) // Monday before publication
  assert.equal(missedEcbPublications("2026-10-16", at("2026-10-19T18:00:00Z")), 1) // Monday after publication
})

test("Easter: Thursday's rate is still current on Easter Monday evening", () => {
  // 2026: Good Friday 04-03, Easter Monday 04-06 — no publications
  assert.equal(missedEcbPublications("2026-04-02", at("2026-04-06T20:00:00Z")), 0)
  assert.equal(missedEcbPublications("2026-04-02", at("2026-04-07T20:00:00Z")), 1)
})

const info = (over: Partial<BuildInfo> = {}): BuildInfo => ({
  buildTime: "2026-10-19T16:35:00.000Z",
  commit: "abc1234def",
  branch: "main",
  fx: { pair: "USD/EUR", date: "2026-10-19" },
  metals: {
    XAU: { priceTime: "2026-10-19T16:34:00.000Z" },
    XAG: { priceTime: "2026-10-19T16:34:00.000Z" },
  },
  ...over,
})

test("healthy build passes", () => {
  const r = checkBuildInfo(info(), { now: at("2026-10-19T18:00:00Z"), expectedCommit: "abc1234def", expectedCommitTime: at("2026-10-18T10:00:00Z") })
  assert.deepEqual(r.failures, [])
})

test("live build not main HEAD fails after the deploy grace, not before", () => {
  const base = { now: at("2026-10-19T18:00:00Z"), expectedCommit: "fff9999aaa" }
  assert.equal(checkBuildInfo(info(), { ...base, expectedCommitTime: at("2026-10-19T17:30:00Z") }).failures.length, 0)
  assert.match(checkBuildInfo(info(), { ...base, expectedCommitTime: at("2026-10-19T09:00:00Z") }).failures.join(), /not main HEAD/)
})

test("stale embedded ECB data fails; a stalled deploy pipeline is caught", () => {
  // Build stuck on Wednesday's data; checked the next Tuesday evening.
  const r = checkBuildInfo(
    info({ buildTime: "2026-10-14T16:35:00.000Z", fx: { pair: "USD/EUR", date: "2026-10-14" } }),
    { now: at("2026-10-20T18:00:00Z"), expectedCommit: null, expectedCommitTime: null }
  )
  console.log("    failures:", r.failures)
  assert.ok(r.failures.some((f) => /newer ECB publication/.test(f)))
  assert.ok(r.failures.some((f) => /published build is/.test(f)))
})

test("missing embedded data fails", () => {
  const r = checkBuildInfo(info({ fx: { pair: "USD/EUR", date: null }, metals: { XAU: null } }), {
    now: at("2026-10-19T18:00:00Z"), expectedCommit: null, expectedCommitTime: null,
  })
  assert.equal(r.failures.length, 2)
})
