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
    XPT: { priceTime: "2026-10-19T16:34:00.000Z" },
    XPD: { priceTime: "2026-10-19T16:34:00.000Z" },
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
  assert.ok(r.failures.includes("no embedded FX date (build-time FX fetch failed)"))
  assert.ok(r.failures.includes("no embedded XAU price time"))
})

test("all four metals are monitored: one missing from build-info, or stale, fails", async () => {
  const opts = { now: at("2026-10-19T18:00:00Z"), expectedCommit: null, expectedCommitTime: null }
  const t = "2026-10-19T16:34:00.000Z"
  // the file as it was before Phase A4: gold and silver only
  const old = checkBuildInfo(info({ metals: { XAU: { priceTime: t }, XAG: { priceTime: t } } }), opts)
  console.log("    failures:", old.failures)
  assert.deepEqual(old.failures, ["XPT is not in build-info.json (not monitored)", "XPD is not in build-info.json (not monitored)"])
  // palladium fetch failed at build time
  assert.deepEqual(checkBuildInfo(info({ metals: { XAU: { priceTime: t }, XAG: { priceTime: t }, XPT: { priceTime: t }, XPD: null } }), opts).failures, ["no embedded XPD price time"])
  // platinum price time far behind the build
  const stale = checkBuildInfo(info({ metals: { XAU: { priceTime: t }, XAG: { priceTime: t }, XPT: { priceTime: "2026-10-14T16:34:00.000Z" }, XPD: { priceTime: t } } }), opts)
  assert.match(stale.failures.join(), /XPT price time .* older than the build/)
  // the build writes every metal in METALS
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const route = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "build-info.json", "route.ts"), "utf8")
  assert.match(route, /METALS\.map\(\(m\) => getBuildTimeMetalPrice\(m\.code\)\)/)
  assert.doesNotMatch(route, /getBuildTimeMetalPrice\("X/)
})
