import { test, beforeEach } from "node:test"
import assert from "node:assert/strict"

// Minimal localStorage shim so cache.ts runs under node --test.
class MemoryStorage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}
const ls = new MemoryStorage()
;(globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = { localStorage: ls }

const { cacheGet, cacheGetStale, cacheSet, cachePurgeExpired, retentionFor, FRESH_TTL } = await import("./cache.ts")
const { isExchangeRateFor, isMetalPriceFor, isCachedHistory } = await import("./cache-schemas.ts")

const H = 60 * 60 * 1000
const fx = { base: "USD", date: "2026-10-16", rates: { EUR: 0.8887 } }
const isUsdEur = isExchangeRateFor("USD", "EUR")

function age(key: string, ms: number) {
  const e = JSON.parse(ls.getItem(`cv_${key}`)!)
  e.timestamp -= ms
  ls.setItem(`cv_${key}`, JSON.stringify(e))
}

beforeEach(() => ls.clear())

test("retention = fresh × 10, capped: FX ≤ 7 days, metal ≤ 24 h", () => {
  assert.equal(retentionFor(FRESH_TTL.latest, "fx"), 10 * H)
  assert.equal(retentionFor(FRESH_TTL.longHistory, "history"), 7 * 24 * H)
  assert.equal(retentionFor(FRESH_TTL.metal, "metal"), 150 * 60 * 1000)
  assert.equal(retentionFor(6 * H, "metal"), 24 * H)
})

test("fresh entry: cacheGet returns it", () => {
  cacheSet("k", fx, H, "fx")
  assert.deepEqual(cacheGet("k", isUsdEur), fx)
})

test("past fresh but within retention: cacheGet null, cacheGetStale returns data + age", () => {
  cacheSet("k", fx, H, "fx")
  age("k", 3 * H)
  assert.equal(cacheGet("k", isUsdEur), null)
  const stale = cacheGetStale("k", isUsdEur)
  assert.deepEqual(stale?.data, fx)
  assert.ok(stale!.ageMs >= 3 * H && stale!.ageMs < 3 * H + 1000)
})

test("purge keeps the fallback (past fresh, within retention), removes past retention", () => {
  cacheSet("keep", fx, H, "fx")
  cacheSet("drop", fx, H, "fx")
  age("keep", 3 * H)
  age("drop", 11 * H)
  cachePurgeExpired()
  assert.notEqual(ls.getItem("cv_keep"), null)
  assert.equal(ls.getItem("cv_drop"), null)
  assert.equal(cacheGetStale("drop", isUsdEur), null)
})

test("old-format entry ({ ttl }) and corrupted JSON are dropped", () => {
  ls.setItem("cv_old", JSON.stringify({ data: fx, timestamp: Date.now(), ttl: H }))
  ls.setItem("cv_bad", "{not json")
  assert.equal(cacheGetStale("old", isUsdEur), null)
  assert.equal(ls.getItem("cv_old"), null)
  ls.setItem("cv_old2", JSON.stringify({ data: fx, timestamp: Date.now(), ttl: H }))
  cachePurgeExpired()
  assert.equal(ls.getItem("cv_old2"), null)
  assert.equal(ls.getItem("cv_bad"), null)
})

test("schema: wrong pair, non-finite rate, implausible date are rejected", () => {
  cacheSet("k", { ...fx, base: "GBP" }, H, "fx")
  assert.equal(cacheGet("k", isUsdEur), null)
  cacheSet("k", { ...fx, rates: { EUR: "0.88" } }, H, "fx")
  assert.equal(cacheGet("k", isUsdEur), null)
  cacheSet("k", { ...fx, rates: { EUR: -1 } }, H, "fx")
  assert.equal(cacheGet("k", isUsdEur), null)
  cacheSet("k", { ...fx, date: "1970-01-01" }, H, "fx")
  assert.equal(cacheGet("k", isUsdEur), null)
  cacheSet("k", { ...fx, date: "2999-01-01" }, H, "fx")
  assert.equal(cacheGet("k", isUsdEur), null)
})

test("envelope: timestamp in the future is rejected", () => {
  cacheSet("k", fx, H, "fx")
  age("k", -24 * H)
  assert.equal(cacheGetStale("k", isUsdEur), null)
})

test("metal and history payload validators", () => {
  const isXau = isMetalPriceFor("XAU")
  assert.equal(isXau({ metal: "XAU", price: 4166.1, priceTime: "2026-10-18T14:14:45.000Z", fetchedAt: "2026-10-18T14:15:00.000Z" }), true)
  assert.equal(isXau({ metal: "XAG", price: 57, priceTime: null, fetchedAt: "2026-10-18T14:15:00.000Z" }), false)
  assert.equal(isXau({ metal: "XAU", price: 4166.1, date: "2026-10-18" }), false) // v1 shape
  const row = { periodKey: "3m", requestedDate: "2026-07-18", historicalDate: "2026-07-17", historicalRate: 0.9, sparklineData: [{ date: "2026-07-17", rate: 0.9 }] }
  assert.equal(isCachedHistory([row]), true)
  assert.equal(isCachedHistory([{ ...row, historicalRate: null, historicalDate: null, sparklineData: [] }]), true)
  assert.equal(isCachedHistory([{ ...row, sparklineData: [{ date: "2026-07-17", rate: null }] }]), false)
  assert.equal(isCachedHistory([{ ...row, historicalRate: Infinity }]), false)
  assert.equal(isCachedHistory([{ historicalRate: 0.9, sparklineData: [] }]), false) // v2 per-period shape
  assert.equal(isCachedHistory([]), false)
})
