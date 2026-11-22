// Every client request gives up after 10 s, and that failure starts the wait
// before the next try. Fake timers; fetch never answers unless told to.
import { test, mock, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

type Mode = "silent" | "ignores abort" | "body never ends" | "ok" | "500"
let mode: Mode = "silent"
let sent: number[] = []
let signals: AbortSignal[] = []
globalThis.fetch = (async (_input: string | URL, init?: RequestInit) => {
  sent.push(Date.now())
  const signal = init?.signal
  if (signal) signals.push(signal)
  if (mode === "ok") return new Response(JSON.stringify({ hello: 1 }))
  if (mode === "500") return new Response("{}", { status: 500 })
  if (mode === "body never ends") return new Response(new ReadableStream({ start() {} }))
  return new Promise<Response>((_, reject) => {
    if (mode === "ignores abort" || !signal) return
    if (signal.aborted) reject(signal.reason)
    signal.addEventListener("abort", () => reject(signal.reason))
  })
}) as typeof fetch

const { getJson, REQUEST_TIMEOUT_MS } = await import("./http.ts")
const { getLatestRate, fetchMetalPrice, fetchTimeSeries, fetchRateOn, latestCacheKey, metalCacheKey } = await import("./api.ts")
const { startAutoRefresh } = await import("./refresh.ts")
const { retryAt, resetBackoff } = await import("./backoff.ts")

const S = 1000
const settle = async () => { for (let i = 0; i < 3; i++) await new Promise((r) => setImmediate(r)) }
function outcome(p: Promise<unknown>) {
  const o = { state: "waiting", name: "" }
  p.then(() => { o.state = "answered" }, (e: Error) => { o.state = "failed"; o.name = e.name })
  return o
}

beforeEach(() => {
  resetBackoff()
  mode = "silent"
  sent = []
  signals = []
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.UTC(2026, 10, 22, 9, 0, 0) })
})
afterEach(() => mock.timers.reset())

test("the limit is 10 seconds", () => assert.equal(REQUEST_TIMEOUT_MS, 10 * S))

const REQUESTS: [string, () => Promise<unknown>][] = [
  ["latest rate", () => getLatestRate("USD", "TRY")],
  ["latest rate, Refresh", () => getLatestRate("EUR", "TRY", { force: true })],
  ["metal price", () => fetchMetalPrice("XAU")],
  ["time series", () => fetchTimeSeries("2016-11-15", "2026-11-22", "USD", ["TRY"])],
  ["time series, with the caller's signal", () => fetchTimeSeries("2016-11-15", "2026-11-22", "USD", ["TRY"], new AbortController().signal)],
  ["rate on a date", () => fetchRateOn("2020-03-12", "USD", "TRY")],
]
for (const [name, request] of REQUESTS) {
  test(`${name}: fails at 10 s without an answer, not before, and drops the connection`, async () => {
    const o = outcome(request())
    await settle()
    mock.timers.tick(10 * S - 1)
    await settle()
    assert.equal(o.state, "waiting")
    mock.timers.tick(1)
    await settle()
    assert.deepEqual([o.state, o.name], ["failed", "TimeoutError"])
    assert.equal(signals.at(-1)?.aborted, true)
  })
}

for (const how of ["ignores abort", "body never ends"] as const) {
  test(`the limit holds when the request ${how}`, async () => {
    mode = how
    const o = outcome(getJson("https://example.test/x", "x"))
    await settle()
    mock.timers.tick(10 * S)
    await settle()
    assert.deepEqual([o.state, o.name], ["failed", "TimeoutError"])
  })
}

test("a caller that leaves gets AbortError at once, which is not a timeout", async () => {
  const c = new AbortController()
  const o = outcome(getJson("https://example.test/x", "x", c.signal))
  await settle()
  c.abort()
  await settle()
  assert.deepEqual([o.state, o.name], ["failed", "AbortError"])
  const left = new AbortController()
  left.abort()
  const o2 = outcome(getJson("https://example.test/x", "x", left.signal))
  await settle()
  assert.deepEqual([o2.state, o2.name], ["failed", "AbortError"])
})

test("leaving a page cancels its series and dated-rate requests through the api", async () => {
  for (const request of [
    (s: AbortSignal) => fetchTimeSeries("2016-11-15", "2026-11-22", "USD", ["TRY"], s),
    (s: AbortSignal) => fetchRateOn("2020-03-13", "USD", "TRY", s),
  ]) {
    const c = new AbortController()
    const o = outcome(request(c.signal))
    await settle()
    c.abort()
    await settle()
    assert.deepEqual([o.state, o.name], ["failed", "AbortError"])
    assert.equal(signals.at(-1)?.aborted, true, "the connection is dropped too")
  }
})

test("an answer clears the timer; an HTTP error fails at once", async () => {
  mode = "ok"
  assert.deepEqual(await getJson("https://example.test/x", "x"), { hello: 1 })
  mock.timers.tick(11 * S)
  assert.equal(signals.at(-1)?.aborted, false)
  mode = "500"
  await assert.rejects(getJson("https://example.test/x", "API error"), /API error: 500/)
})

for (const kind of ["fx", "metal"] as const) {
  test(`${kind}: a timeout is an error like any other: saved-data state, then 30 s, 1, 2 min of waiting`, async () => {
    let failed = false
    const t0 = Date.now()
    const key = kind === "fx" ? latestCacheKey("USD", "TRY") : metalCacheKey("XAU")
    const auto = startAutoRefresh({
      freshTtlMs: 3600 * S,
      getFetchedAt: () => null,
      retryAt: () => retryAt(key),
      visibility: { isVisible: () => true, subscribe: () => () => {} },
      refresh: async ({ force }) => {
        try { await (kind === "fx" ? getLatestRate("USD", "TRY", { force }) : fetchMetalPrice("XAU", { force })) } catch { failed = true }
      },
    })
    void auto.check()
    await settle()
    for (let t = 0; t < 240; t++) {
      mock.timers.tick(S)
      await settle()
      if (t === 8) assert.equal(failed, false)
      if (t === 9) assert.equal(failed, true, "stale at 10 s")
    }
    // each try takes 10 s, then waits 30, 60, 120 s
    assert.deepEqual(sent.map((t) => (t - t0) / S), [0, 40, 110, 240])
    auto.stop()
  })
}

test("no other client code makes a request: http.ts is the only fetch (the build's own is server-side)", () => {
  const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
  const code = fs.readdirSync(SRC, { recursive: true }).map(String).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"))
  const callers = code
    .filter((f) => /(?<![\w.])(?:(?:window|globalThis)\.)?fetch\(|new XMLHttpRequest|new EventSource|sendBeacon\(/.test(fs.readFileSync(path.join(SRC, f), "utf8").replace(/^\s*\/\/.*$/gm, "")))
    .map((f) => f.replace(/\\/g, "/"))
    .sort()
  assert.deepEqual(callers, ["lib/build-data.ts", "lib/http.ts"])
})
