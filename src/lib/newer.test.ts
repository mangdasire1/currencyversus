// Build data or browser data: whichever is newer is shown.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { newest, rateTime, metalTime, historyTime } from "./newer.ts"
import { derivePeriodHistory } from "./history.ts"
import { TIME_PERIODS } from "./currencies.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), "utf8").replace(/\r\n/g, "\n")

test("rate: the later ECB date wins, however recently the older one was fetched", () => {
  const build = { date: "2026-11-20", fetchedAt: null as string | null }
  const olderCache = { date: "2026-11-19", fetchedAt: "2026-11-21T09:00:00.000Z" }
  const newerCache = { date: "2026-11-23", fetchedAt: "2026-11-20T01:00:00.000Z" }
  assert.equal(newest(olderCache, [build], rateTime), build)
  assert.equal(newest(build, [olderCache], rateTime), build)
  assert.equal(newest(newerCache, [build], rateTime), newerCache)
  assert.equal(newest(build, [newerCache], rateTime), newerCache)
})

test("tie: the candidate, so a same-day answer keeps its fetch time", () => {
  const build = { date: "2026-11-20" }, answer = { date: "2026-11-20" }
  assert.equal(newest(answer, [build], rateTime), answer)
})

test("metal: the provider's time, across ISO spellings; without one, the fetch time is the latest it can be", () => {
  const build = { price: 3539, priceTime: "2026-11-22T10:44:38.000Z" as string | null, fetchedAt: null as string | null }
  const older = { price: 3500, priceTime: "2026-11-22T10:44:37Z", fetchedAt: "2026-11-22T12:00:00.000Z" }
  const newer = { price: 3550, priceTime: "2026-11-22T10:44:39Z", fetchedAt: "2026-11-22T10:45:00.000Z" }
  assert.equal(newest(older, [build], metalTime), build)
  assert.equal(newest(newer, [build], metalTime), newer)
  const noTime = { price: 3400, priceTime: null, fetchedAt: "2026-11-22T09:00:00.000Z" }
  assert.equal(newest(noTime, [build], metalTime), build)
})

test("history: the day the periods are counted from", () => {
  const build = [{ requestedDate: "2026-10-22" }], older = [{ requestedDate: "2026-10-21" }], newer = [{ requestedDate: "2026-10-23" }]
  assert.equal(newest(older, [build], historyTime), build)
  assert.equal(newest(newer, [build], historyTime), newer)
  assert.equal(newest(build, [[]], historyTime), build)
})

test("history: every day of four years is newer than the one before, month ends and 29 February included", () => {
  let before: ReturnType<typeof derivePeriodHistory> | null = null
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2030, 0, 1); t += 24 * 3600 * 1000) {
    const rows = derivePeriodHistory([], new Date(t), TIME_PERIODS)
    if (before) assert.equal(newest(before, [rows], historyTime), rows, new Date(t).toISOString().slice(0, 10))
    before = rows
  }
})

test("the newest of several; unknown times and empty slots never win", () => {
  const a = { date: "2026-11-18" }, b = { date: "2026-11-20" }, c = { date: "2026-11-19" }
  assert.equal(newest(a, [null, b, undefined, c], rateTime), b)
  const unknown = { date: "" }
  assert.equal(newest(a, [unknown], rateTime), a)
  assert.equal(newest(unknown, [a], rateTime), unknown)
})

test("hooks: every path that puts data on screen goes through that rule", () => {
  const fx = read("hooks", "useExchangeRate.ts")
  const metal = read("hooks", "useMetalRate.ts")
  for (const [name, s, time] of [["FX", fx, "rateTime"], ["metal", metal, "metalTime"]]) {
    assert.match(s, new RegExp(`const best = newest\\(candidate, [^\\n]*${time}\\)`), name)
    assert.match(s, /show\((rate|r)\)\n\s*setStale\(false\)/, name + ": an answer or fresh cache")
    assert.match(s, /const shown = show\(staleHit\.data\)/, name + ": a failure")
    assert.match(s, /setStaleAgeMs\(shown === staleHit\.data \? staleHit\.ageMs : null\)/, name + ": age")
    assert.match(s, new RegExp(`show\\(newest(<Quote>)?\\([^\\n]*\\[kept\\?\\.data\\], ${time}\\)\\)`), name + ": before an answer")
  }
  assert.match(fx, /const held = \[shownRef\.current, buildRef\.current \?\? null\]\.map\(\(r\) => \(isForPair\(r, base, target\) \? r : null\)\)/)
  assert.equal((fx.match(/setData\(/g) ?? []).length, 2) // show(), and clearing for a non-FX pair
  assert.match(metal, /newest\(candidate, \[shownRef\.current, buildRef\.current\], metalTime\)/)
  assert.equal((metal.match(/setPrice\(/g) ?? []).length, 1)
  const history = read("hooks", "useHistoricalRates.ts")
  assert.match(history, /rows: newest\(rows, \[prev\?\.pairKey === pairKey \? prev\.rows : null, buildRows\], historyTime\)/)
  for (const call of ["show(cachedRows)", "show(rows)", "return show(staleRows)"]) assert.ok(history.includes(call), call)
})

test("home: the build's metal times reach the cards and the converter", () => {
  const page = read("app", "(en)", "page.tsx")
  const home = read("app", "(en)", "HomeClient.tsx")
  for (const [code, name] of [["XAU", "gold"], ["XAG", "silver"], ["XPT", "platinum"], ["XPD", "palladium"]]) {
    assert.ok(page.includes(`${code}: ${name}Data?.priceTime ?? null`), code)
    assert.match(home, new RegExp(`useMetalRate\\("${code}", initial\\w+, true, initialMetalTimes\\.${code}\\)`), code)
  }
  assert.match(home, /initialMetals=\{\{ usd: initialMetals, time: initialMetalTimes \}\}/)
  assert.match(home, /initialMetalUsd: initialMetals, initialMetalTime: initialMetalTimes/)
  assert.match(read("components", "CurrencyConverter.tsx"), /= \{ \.\.\.initialMetals\?\.time \}/)
})
