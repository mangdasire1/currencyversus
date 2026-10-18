// R-02 acceptance: with fake timers, advance the clock past the fresh TTL and
// check that the same open "tab" sends a new provider request. The real data
// path is exercised: fetchMetalPrice/getLatestRate → localStorage cache →
// global fetch (counted).
import { test, mock, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"

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

// Provider stub: counts requests per host.
const calls = { gold: 0, fx: 0 }
globalThis.fetch = (async (input: string | URL) => {
  const url = String(input)
  if (url.includes("gold-api.com")) {
    calls.gold++
    return new Response(JSON.stringify({ price: 4000 + calls.gold, symbol: "XAU", updatedAt: new Date().toISOString() }))
  }
  calls.fx++
  return new Response(JSON.stringify({ base: "USD", date: "2026-10-16", rates: { EUR: 0.88 + calls.fx / 1000 } }))
}) as typeof fetch

const { startAutoRefresh } = await import("./refresh.ts")
const { fetchMetalPrice, getLatestRate } = await import("./api.ts")
const { FRESH_TTL } = await import("./cache.ts")

const MIN = 60_000
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }

// Fake document visibility.
function fakeVisibility(initial: boolean) {
  let visible = initial
  const subs = new Set<() => void>()
  return {
    source: { isVisible: () => visible, subscribe: (cb: () => void) => { subs.add(cb); return () => subs.delete(cb) } },
    set(v: boolean) { visible = v; subs.forEach((cb) => cb()) },
  }
}

// What a hook does: hold the current data's fetchedAt, refresh through the api.
function metalTab(visibility: ReturnType<typeof fakeVisibility>["source"]) {
  let fetchedAt: number | null = null
  const load = async (force: boolean) => {
    const r = await fetchMetalPrice("XAU", { force })
    fetchedAt = Date.parse(r.fetchedAt)
    return r
  }
  return {
    load,
    start: () => startAutoRefresh({
      freshTtlMs: FRESH_TTL.metal,
      getFetchedAt: () => fetchedAt,
      refresh: ({ force }) => load(force),
      visibility,
    }),
  }
}

beforeEach(() => {
  ls.clear()
  calls.gold = 0
  calls.fx = 0
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.UTC(2026, 9, 19, 9, 0, 0) })
})
afterEach(() => mock.timers.reset())

test("metal: after the 15-min fresh TTL a visible tab sends a new provider request", async () => {
  const vis = fakeVisibility(true)
  const tab = metalTab(vis.source)
  await tab.load(false)
  const auto = tab.start()
  assert.equal(calls.gold, 1)

  mock.timers.tick(14 * MIN); await flush()
  assert.equal(calls.gold, 1, "no request before TTL")

  mock.timers.tick(1 * MIN); await flush()
  assert.equal(calls.gold, 2, "new request once TTL passed")

  mock.timers.tick(15 * MIN); await flush()
  assert.equal(calls.gold, 3, "keeps checking every TTL while visible")
  console.log(`    gold-api requests at t=0, 14, 15, 30 min: 1, 1, 2, 3`)
  auto.stop()
})

test("FX: after the 1-hour fresh TTL a visible tab sends a new provider request", async () => {
  const vis = fakeVisibility(true)
  let fetchedAt: number | null = null
  const load = async (force: boolean) => { fetchedAt = Date.parse((await getLatestRate("USD", "EUR", { force })).fetchedAt!) }
  await load(false)
  const auto = startAutoRefresh({ freshTtlMs: FRESH_TTL.latest, getFetchedAt: () => fetchedAt, refresh: ({ force }) => load(force), visibility: vis.source })
  mock.timers.tick(59 * MIN); await flush()
  assert.equal(calls.fx, 1)
  mock.timers.tick(1 * MIN); await flush()
  assert.equal(calls.fx, 2)
  console.log(`    frankfurter requests at t=0, 59, 60 min: 1, 1, 2`)
  auto.stop()
})

test("visibilitychange: hidden tab makes no request; becoming visible with stale data requests at once", async () => {
  const vis = fakeVisibility(true)
  const tab = metalTab(vis.source)
  await tab.load(false)
  const auto = tab.start()

  vis.set(false)
  mock.timers.tick(3 * 60 * MIN); await flush() // 3 hours in the background
  assert.equal(calls.gold, 1, "no requests while hidden")

  vis.set(true); await flush()
  assert.equal(calls.gold, 2, "request on return because data is past TTL")

  vis.set(false); vis.set(true); await flush()
  assert.equal(calls.gold, 2, "no request on return while data is still fresh")
  console.log(`    hidden 3 h: 0 requests; on visible: +1; visible again while fresh: +0`)
  auto.stop()
})

test("manual refresh bypasses a fresh cache; a normal load does not", async () => {
  const vis = fakeVisibility(true)
  const tab = metalTab(vis.source)
  await tab.load(false)
  const auto = tab.start()

  mock.timers.tick(1 * MIN)
  await tab.load(false)
  assert.equal(calls.gold, 1, "normal load within TTL is served from cache")

  await auto.refreshNow()
  assert.equal(calls.gold, 2, "refreshNow forces a provider request")

  await getLatestRate("USD", "EUR")
  await getLatestRate("USD", "EUR")
  assert.equal(calls.fx, 1)
  await getLatestRate("USD", "EUR", { force: true })
  assert.equal(calls.fx, 2)
  console.log(`    within TTL: load → cache (0 requests), refreshNow → +1 gold-api, force FX → +1 frankfurter`)
  auto.stop()
})

test("stop() cancels pending checks", async () => {
  const vis = fakeVisibility(true)
  const tab = metalTab(vis.source)
  await tab.load(false)
  const auto = tab.start()
  auto.stop()
  mock.timers.tick(60 * MIN); await flush()
  assert.equal(calls.gold, 1)
})

test("two surfaces on the same pair refreshing together send one provider request", async () => {
  const vis = fakeVisibility(true)
  const a = metalTab(vis.source)
  const b = metalTab(vis.source)
  await Promise.all([a.load(false), b.load(false)])
  assert.equal(calls.gold, 1)
  const autoA = a.start()
  const autoB = b.start()
  mock.timers.tick(15 * MIN); await flush()
  assert.equal(calls.gold, 2, "both schedulers fired, one request")
  console.log(`    2 surfaces, initial load + TTL refresh: gold-api requests = ${calls.gold}`)
  autoA.stop(); autoB.stop()
})
