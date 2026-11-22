// A failing provider is not hammered. Fake timers drive the real path:
// scheduler (refresh.ts) → api.ts → backoff.ts → cache → fetch (counted, with
// the time of each request).
import { test, mock, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

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

type Answer = "ok" | "refused" | "500" | "429" | "junk" | "not json"
let answer: Answer = "ok"
let sent: { at: number; what: string }[] = []
globalThis.fetch = (async (input: string | URL) => {
  const url = String(input)
  const metal = url.includes("gold-api.com")
  sent.push({ at: Date.now(), what: metal ? url.slice(-3) : url.replace(/.*symbols=/, "") })
  if (answer === "refused") throw new TypeError("Failed to fetch")
  if (answer === "500" || answer === "429") return new Response("{}", { status: Number(answer) })
  if (answer === "not json") return new Response("<html>")
  if (answer === "junk") return new Response(JSON.stringify(metal ? {} : { base: "EUR", date: "2026-11-20", rates: {} }))
  return new Response(JSON.stringify(metal
    ? { price: 3500, updatedAt: new Date().toISOString() }
    : { base: "EUR", date: "2026-11-20", rates: { USD: 1.09, TRY: 55.12 } }))
}) as typeof fetch

const { startAutoRefresh, whenVisible } = await import("./refresh.ts")
const { fetchMetalPrice, getLatestRate, metalCacheKey, latestCacheKey } = await import("./api.ts")
const { cacheGetStale, cacheSet, FRESH_TTL } = await import("./cache.ts")
const { isExchangeRateFor, isMetalPriceFor } = await import("./cache-schemas.ts")
const { retryAt, resetBackoff, RETRY_DELAYS_MS } = await import("./backoff.ts")

const S = 1000
const MIN = 60 * S
const MAX_PER_MINUTE = 2 // the fixed bound, per resource

const settle = async () => { for (let i = 0; i < 3; i++) await new Promise((r) => setImmediate(r)) }
async function pass(ms: number, each?: () => void | Promise<void>) {
  for (let t = 0; t < ms; t += S) {
    mock.timers.tick(S)
    await settle()
    if (each) { await each(); await settle() }
  }
}

function fakeVisibility(initial = true) {
  let visible = initial
  const subs = new Set<() => void>()
  return {
    source: { isVisible: () => visible, subscribe: (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb) } } },
    set(v: boolean) { visible = v; for (const cb of [...subs]) cb() },
    quietly(v: boolean) { visible = v }, // no event
  }
}
type Visibility = ReturnType<typeof fakeVisibility>

// What useMetalRate and useExchangeRate do: refresh through the api; on
// failure fall back to the retained cache, whose fetch time is the old one.
function surface(kind: "metal" | "fx", vis: Visibility) {
  const key = kind === "metal" ? metalCacheKey("XAU") : latestCacheKey("USD", "TRY")
  const s = { fetchedAt: null as number | null, stale: false, loads: 0 }
  const auto = startAutoRefresh({
    freshTtlMs: kind === "metal" ? FRESH_TTL.metal : FRESH_TTL.latest,
    getFetchedAt: () => s.fetchedAt,
    retryAt: () => retryAt(key),
    visibility: vis.source,
    refresh: async ({ force }) => {
      s.loads++
      try {
        const r = kind === "metal" ? await fetchMetalPrice("XAU", { force }) : await getLatestRate("USD", "TRY", { force })
        s.fetchedAt = Date.parse(r.fetchedAt!)
        s.stale = false
      } catch {
        const hit = kind === "metal" ? cacheGetStale(key, isMetalPriceFor("XAU")) : cacheGetStale(key, isExchangeRateFor("USD", "TRY"))
        if (hit) s.fetchedAt = Date.parse((hit.data as { fetchedAt: string }).fetchedAt)
        s.stale = true
      }
    },
  })
  void auto.check()
  return { s, auto }
}

// A tab left open past the TTL whose provider then fails.
async function failingTab(kind: "metal" | "fx", how: Answer = "500") {
  const vis = fakeVisibility()
  const tab = surface(kind, vis)
  await settle()
  answer = how
  mock.timers.tick(kind === "metal" ? FRESH_TTL.metal : FRESH_TTL.latest)
  await settle()
  const failedAt = sent.at(-1)!.at
  sent = sent.filter((r) => r.at >= failedAt)
  return { vis, failedAt, ...tab }
}

const busiestMinute = () => Math.max(0, ...sent.map((r) => sent.filter((x) => x.what === r.what && x.at >= r.at && x.at < r.at + MIN).length))
const offsets = (t0: number) => sent.map((r) => (r.at - t0) / S)

beforeEach(() => {
  ls.clear()
  resetBackoff()
  answer = "ok"
  sent = []
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.UTC(2026, 10, 22, 9, 0, 0) })
})
afterEach(() => mock.timers.reset())

test("the waits: 30 s, 1, 2, 5 minutes", () => {
  assert.deepEqual([...RETRY_DELAYS_MS], [30 * S, MIN, 2 * MIN, 5 * MIN])
})

for (const kind of ["metal", "fx"] as const) {
  for (const how of ["refused", "500", "429", "junk", "not json"] as const) {
    test(`${kind}, ${how}: at most ${MAX_PER_MINUTE} requests in any minute while it fails; 30 s → 1 → 2 → 5 → 5 min`, async () => {
      const { failedAt, auto, s } = await failingTab(kind, how)
      await pass(30 * MIN)
      assert.ok(busiestMinute() <= MAX_PER_MINUTE, `${busiestMinute()} in one minute`)
      assert.deepEqual(offsets(failedAt).slice(0, 7), [0, 30, 90, 210, 510, 810, 1110])
      assert.equal(s.stale, true)
      auto.stop()
    })
  }
}

test("no saved data at all: the first failure is retried after 30 s, not a TTL later", async () => {
  answer = "500"
  const t0 = Date.now()
  const { auto } = surface("fx", fakeVisibility())
  await settle() // the first request fails at t0
  await pass(100 * S)
  assert.deepEqual(offsets(t0), [0, 30, 90])
  auto.stop()
})

for (const kind of ["metal", "fx"] as const) {
  test(`${kind}: bound holds with five surfaces on one resource and one remounting every second`, async () => {
    const { vis, failedAt, auto } = await failingTab(kind)
    const more = [1, 2, 3, 4].map(() => surface(kind, vis))
    let remounted = surface(kind, vis)
    await pass(5 * MIN, () => {
      remounted.auto.stop()
      remounted = surface(kind, vis) // a navigation, a swap
    })
    assert.ok(busiestMinute() <= MAX_PER_MINUTE, `${busiestMinute()} in one minute`)
    assert.deepEqual(offsets(failedAt), [0, 30, 90, 210])
    assert.equal(remounted.s.stale, true, "a surface mounted during the wait says the data is saved")
    for (const t of [...more, remounted]) t.auto.stop()
    auto.stop()
  })
}

test("bound holds when the tab is switched away and back every second", async () => {
  const { vis, auto, failedAt } = await failingTab("fx")
  await pass(5 * MIN, () => { vis.set(false); vis.set(true) })
  assert.ok(busiestMinute() <= MAX_PER_MINUTE)
  assert.deepEqual(offsets(failedAt), [0, 30, 90, 210])
  auto.stop()
})

test("hidden: no automatic request; back before the wait ends → the rest of it is waited out", async () => {
  const { vis, auto, failedAt } = await failingTab("metal")
  await pass(5 * S)
  vis.set(false)
  await pass(10 * S)
  vis.set(true)
  await pass(14 * S)
  assert.deepEqual(offsets(failedAt), [0])
  await pass(1 * S)
  assert.deepEqual(offsets(failedAt), [0, 30])
  auto.stop()
})

test("hidden past the end of the wait: nothing until seen, then one request at once and the waits go on growing", async () => {
  const { vis, auto, failedAt } = await failingTab("metal")
  vis.set(false)
  await pass(10 * MIN)
  assert.deepEqual(offsets(failedAt), [0])
  vis.set(true)
  await settle()
  assert.deepEqual(offsets(failedAt), [0, 600])
  await pass(MIN)
  assert.deepEqual(offsets(failedAt), [0, 600, 660])
  auto.stop()
})

test("a tab opened in the background asks for nothing until it is seen, then at once", async () => {
  const vis = fakeVisibility(false)
  const { auto, s } = surface("fx", vis)
  await pass(3 * MIN)
  assert.equal(sent.length, 0)
  vis.set(true)
  await settle()
  assert.equal(sent.length, 1)
  assert.equal(s.stale, false)
  auto.stop()
})

test("a timer that fires in a hidden tab (no event seen) sends nothing", async () => {
  const { vis, auto, failedAt } = await failingTab("metal")
  vis.quietly(false)
  await pass(2 * MIN)
  assert.deepEqual(offsets(failedAt), [0])
  auto.stop()
})

test("success ends the waits: the next check is a TTL later, the next failure waits 30 s again", async () => {
  const { auto, failedAt, s } = await failingTab("metal")
  await pass(89 * S) // failed at 0 and 30; next at 90
  answer = "ok"
  await pass(1 * S)
  assert.deepEqual(offsets(failedAt), [0, 30, 90])
  assert.equal(s.stale, false)
  assert.equal(retryAt(metalCacheKey("XAU")), null)
  answer = "500"
  await pass(FRESH_TTL.metal + 30 * S)
  assert.deepEqual(offsets(failedAt), [0, 30, 90, 990, 1020])
  auto.stop()
})

test("Refresh is never held back by a wait, and a failed one does not move the wait", async () => {
  const { auto, failedAt } = await failingTab("fx")
  for (let i = 0; i < 3; i++) {
    await pass(2 * S)
    await auto.refreshNow()
  }
  assert.deepEqual(offsets(failedAt), [0, 2, 4, 6])
  await pass(24 * S)
  assert.deepEqual(offsets(failedAt), [0, 2, 4, 6, 30], "automatic retry still at 30 s")
  await pass(60 * S)
  assert.deepEqual(offsets(failedAt), [0, 2, 4, 6, 30, 90], "and the next wait is 1 minute, not 5")
  auto.stop()
})

test("a successful Refresh during a wait returns to normal", async () => {
  const { auto, failedAt, s } = await failingTab("fx")
  await pass(5 * S)
  answer = "ok"
  await auto.refreshNow()
  assert.equal(s.stale, false)
  await pass(10 * MIN)
  assert.deepEqual(offsets(failedAt), [0, 5])
  auto.stop()
})

test("a failed Refresh over a fresh cache is retried: the old entry does not pass for a success", async () => {
  const { auto, s } = surface("metal", fakeVisibility())
  await settle()
  await pass(5 * S)
  answer = "500"
  await auto.refreshNow()
  assert.equal(s.stale, true)
  await pass(30 * S)
  assert.equal(sent.length, 3)
  assert.equal(s.stale, true)
  auto.stop()
})

test("another tab's success, found in the cache, ends the wait without a request", async () => {
  const { auto, s } = await failingTab("metal")
  await pass(10 * S)
  const at = new Date().toISOString()
  cacheSet(metalCacheKey("XAU"), { metal: "XAU", price: 3600, priceTime: at, fetchedAt: at }, FRESH_TTL.metal, "metal")
  await pass(20 * S)
  assert.equal(sent.length, 1)
  assert.equal(s.stale, false)
  assert.equal(retryAt(metalCacheKey("XAU")), null)
  auto.stop()
})

test("waits are per resource: one failing metal does not hold back another", async () => {
  answer = "500"
  await assert.rejects(fetchMetalPrice("XAU"))
  answer = "ok"
  await fetchMetalPrice("XAG")
  await assert.rejects(fetchMetalPrice("XAU"), { name: "RetryWaitError" })
  assert.deepEqual(sent.map((r) => r.what), ["XAU", "XAG"])
})

test("scheduler alone: a refresh that changes nothing cannot spin", async () => {
  let runs = 0
  const t0 = Date.now()
  const auto = startAutoRefresh({
    freshTtlMs: MIN,
    getFetchedAt: () => t0 - 2 * MIN,
    retryAt: () => null,
    visibility: fakeVisibility().source,
    refresh: () => { if (++runs > 500) auto.stop() },
  })
  for (let i = 0; i < 50; i++) { mock.timers.tick(100); await settle() }
  assert.ok(runs <= 6, `${runs} runs in 5 s`)
  auto.stop()
})

test("one-off background loads wait for a visible tab, run once, and can be cancelled", () => {
  const vis = fakeVisibility(false)
  let runs = 0
  whenVisible(vis.source, () => runs++)
  const cancel = whenVisible(vis.source, () => assert.fail("cancelled"))
  cancel()
  assert.equal(runs, 0)
  vis.set(true)
  vis.set(false)
  vis.set(true)
  assert.equal(runs, 1)
})

test("hooks: every automatic request goes through the scheduler or whenVisible", () => {
  const hook = (f: string) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", f), "utf8")
  for (const [f, key] of [["useExchangeRate.ts", "latestCacheKey\\(base, target\\)"], ["useMetalRate.ts", "metalCacheKey\\(metal\\)"]]) {
    const s = hook(f)
    assert.match(s, new RegExp(`retryAt: \\(\\) => retryAt\\(${key}\\)`), f)
    assert.match(s, /void auto\.check\(\)/, f)
    assert.doesNotMatch(s, /void load\(/, `${f}: a request outside the scheduler`)
  }
  assert.match(hook("useHistoricalRates.ts"), /whenVisible\(documentVisibility\(\), \(\) => \{\s*loadPeriodHistory\(/)
  assert.match(hook("usePairChart.ts"), /whenVisible\(documentVisibility\(\), \(\) => \{\s*fetchPairSeries\(/)
  for (const f of ["useHistoricalRates.ts", "usePairChart.ts"]) assert.match(hook(f), /cancelWait\(\)/, f)
})
