import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  parseSitemap, selectChangedUrls, buildPayloads, classifyResponse, planSubmission,
  INDEXNOW_ENDPOINT, MAX_URLS_PER_REQUEST, INDEXNOW_KEY, runIndexNow,
} from "./indexnow.ts"

const HOST = "currencyversus.com"
const KEY = INDEXNOW_KEY
const TODAY = "2026-10-23"

const sitemap = (entries: Array<[string, string | null]>) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries
    .map(([loc, lastmod]) => `  <url>\n    <loc>${loc}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}    <changefreq>daily</changefreq>\n  </url>`)
    .join("\n") +
  `\n</urlset>`

const MIXED = sitemap([
  ["https://currencyversus.com/", "2026-10-15"],
  ["https://currencyversus.com/usd-vs-try/", TODAY],
  ["https://currencyversus.com/eur-vs-usd/", TODAY],
  ["https://currencyversus.com/gold-vs-usd/", null],
  ["https://evil.example/usd-vs-try/", TODAY],
])

test("selection: only URLs whose lastmod is today are chosen", () => {
  const s = selectChangedUrls(parseSitemap(MIXED), TODAY, HOST)
  assert.deepEqual(s.urls, ["https://currencyversus.com/usd-vs-try/", "https://currencyversus.com/eur-vs-usd/"])
  assert.equal(s.withLastmod, 4)
})

test("selection: URLs of another host are never selected", () => {
  const s = selectChangedUrls(parseSitemap(MIXED), TODAY, HOST)
  assert.ok(s.urls.every((u) => new URL(u).host === HOST))
  assert.deepEqual(s.foreign, ["https://evil.example/usd-vs-try/"])
  // look-alike hosts are foreign too
  const t = selectChangedUrls([{ loc: "https://currencyversus.com.evil.example/x/", lastmod: TODAY }], TODAY, HOST)
  assert.deepEqual(t.urls, [])
})

test("selection: a sitemap without any lastmod yields an empty list", () => {
  const noDates = sitemap([["https://currencyversus.com/", null], ["https://currencyversus.com/usd-vs-try/", null]])
  const s = selectChangedUrls(parseSitemap(noDates), TODAY, HOST)
  assert.deepEqual(s.urls, [])
  assert.equal(s.withLastmod, 0)
})

test("selection: a W3C datetime lastmod counts by its date", () => {
  const s = selectChangedUrls([{ loc: "https://currencyversus.com/a/", lastmod: `${TODAY}T16:40:00+00:00` }], TODAY, HOST)
  assert.deepEqual(s.urls, ["https://currencyversus.com/a/"])
})

test("plan: without a verified deploy nothing is submitted, whatever the sitemap says", () => {
  const plan = planSubmission({ deployVerified: false, sitemapXml: MIXED, today: TODAY, host: HOST, key: KEY })
  assert.equal(plan.action, "skip")
  assert.match((plan as { reason: string }).reason, /not verified/)
})

test("plan: no lastmod in the live sitemap → skip; unreadable sitemap → skip", () => {
  const noDates = sitemap([["https://currencyversus.com/", null]])
  const a = planSubmission({ deployVerified: true, sitemapXml: noDates, today: TODAY, host: HOST, key: KEY })
  assert.equal(a.action, "skip")
  assert.match((a as { reason: string }).reason, /carries lastmod/)
  const b = planSubmission({ deployVerified: true, sitemapXml: null, today: TODAY, host: HOST, key: KEY })
  assert.equal(b.action, "skip")
})

test("plan: verified deploy + today's lastmod → payload for the global endpoint", () => {
  const plan = planSubmission({ deployVerified: true, sitemapXml: MIXED, today: TODAY, host: HOST, key: KEY })
  assert.equal(plan.action, "submit")
  if (plan.action !== "submit") return
  assert.equal(plan.endpoint, "https://api.indexnow.org/indexnow")
  assert.equal(INDEXNOW_ENDPOINT, plan.endpoint)
  assert.deepEqual(plan.payloads[0], {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: ["https://currencyversus.com/usd-vs-try/", "https://currencyversus.com/eur-vs-usd/"],
  })
})

test("payloads: split at 10,000 URLs; invalid keys rejected", () => {
  const urls = Array.from({ length: MAX_URLS_PER_REQUEST + 5 }, (_, i) => `https://${HOST}/p${i}/`)
  const p = buildPayloads(HOST, KEY, urls)
  assert.deepEqual(p.map((x) => x.urlList.length), [10_000, 5])
  assert.throws(() => buildPayloads(HOST, "short", urls), /8–128/)
  assert.throws(() => buildPayloads(HOST, "has spaces in it!", urls), /8–128/)
})

test("responses: 200 accepted, 202 pending, 429 rate-limited, 400/403/422 errors", () => {
  assert.equal(classifyResponse(200), "accepted")
  assert.equal(classifyResponse(202), "pending-key-verification")
  assert.equal(classifyResponse(429), "rate-limited")
  for (const s of [400, 403, 405, 422, 500]) assert.equal(classifyResponse(s), "error")
})

test("key file: public/<key>.txt exists and contains exactly the key", () => {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "public", `${KEY}.txt`)
  assert.equal(fs.readFileSync(file, "utf8"), KEY)
})

// --- end-to-end with a recording fetch -------------------------------------


const SITE = "https://currencyversus.com"
const HEAD = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
const NOW = new Date("2026-10-23T18:00:00Z")

function buildInfo(commit: string) {
  return {
    buildTime: "2026-10-23T16:40:00.000Z",
    commit,
    branch: "main",
    fx: { pair: "USD/EUR", date: "2026-10-23" },
    metals: { XAU: { priceTime: "2026-10-23T16:39:00.000Z" }, XAG: { priceTime: "2026-10-23T16:39:00.000Z" } },
  }
}

function recorder(opts: { liveCommit?: string; buildInfoStatus?: number; sitemapXml?: string; postStatus?: number }) {
  const calls: Array<{ url: string; method: string }> = []
  const fetchFn = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, method: init?.method ?? "GET" })
    if (url.startsWith(`${SITE}/build-info.json`)) {
      const status = opts.buildInfoStatus ?? 200
      return new Response(JSON.stringify(buildInfo(opts.liveCommit ?? HEAD)), { status })
    }
    if (url.startsWith(`${SITE}/sitemap.xml`)) return new Response(opts.sitemapXml ?? "", { status: 200 })
    if (url === "https://api.indexnow.org/indexnow") return new Response("", { status: opts.postStatus ?? 200 })
    throw new Error(`unexpected request ${url}`)
  }) as typeof fetch
  const lines: string[] = []
  return { calls, fetchFn, lines, log: (l: string) => lines.push(l) }
}

const TODAY_SITEMAP = sitemap([
  ["https://currencyversus.com/", "2026-10-20"],
  ["https://currencyversus.com/usd-vs-try/", "2026-10-23"],
  ["https://currencyversus.com/eur-vs-usd/", "2026-10-23"],
])
const indexNowPosts = (calls: Array<{ url: string; method: string }>) =>
  calls.filter((c) => c.url.startsWith("https://api.indexnow.org/")).length

test("gate: live build is not main HEAD → IndexNow is never called (sitemap not even read)", async () => {
  const r = recorder({ liveCommit: "0000000000000000000000000000000000000000", sitemapXml: TODAY_SITEMAP })
  const res = await runIndexNow({ site: SITE, expectedCommit: HEAD, expectedCommitTime: NOW, dryRun: false, now: NOW, fetchFn: r.fetchFn, log: r.log })
  assert.equal(res.deployVerified, false)
  assert.equal(indexNowPosts(r.calls), 0)
  assert.deepEqual(r.calls.map((c) => c.url.split("?")[0]), [`${SITE}/build-info.json`])
  console.log(`    ${r.lines.join("\n    ")}`)
})

test("gate: build-info.json unavailable or main HEAD unknown → IndexNow is never called", async () => {
  const a = recorder({ buildInfoStatus: 404, sitemapXml: TODAY_SITEMAP })
  await runIndexNow({ site: SITE, expectedCommit: HEAD, expectedCommitTime: NOW, dryRun: false, now: NOW, fetchFn: a.fetchFn, log: a.log })
  assert.equal(indexNowPosts(a.calls), 0)
  const b = recorder({ sitemapXml: TODAY_SITEMAP })
  await runIndexNow({ site: SITE, expectedCommit: null, expectedCommitTime: null, dryRun: false, now: NOW, fetchFn: b.fetchFn, log: b.log })
  assert.equal(b.calls.length, 0)
})

test("gate: right commit but failing production checks (stale embedded ECB data) → not submitted", async () => {
  const r = recorder({ sitemapXml: TODAY_SITEMAP })
  const later = new Date("2026-10-30T18:00:00Z") // build-info data is a week old by then
  const res = await runIndexNow({ site: SITE, expectedCommit: HEAD, expectedCommitTime: NOW, dryRun: false, now: later, fetchFn: r.fetchFn, log: r.log })
  assert.equal(res.deployVerified, false)
  assert.equal(indexNowPosts(r.calls), 0)
})

test("verified deploy, no lastmod in the live sitemap → nothing submitted", async () => {
  const r = recorder({ sitemapXml: sitemap([["https://currencyversus.com/", null]]) })
  const res = await runIndexNow({ site: SITE, expectedCommit: HEAD, expectedCommitTime: NOW, dryRun: false, now: NOW, fetchFn: r.fetchFn, log: r.log })
  assert.equal(res.plan.action, "skip")
  assert.equal(indexNowPosts(r.calls), 0)
})

test("dry run: verified deploy + changed pages → plan logged, no POST", async () => {
  const r = recorder({ sitemapXml: TODAY_SITEMAP })
  const res = await runIndexNow({ site: SITE, expectedCommit: HEAD, expectedCommitTime: NOW, dryRun: true, now: NOW, fetchFn: r.fetchFn, log: r.log })
  assert.equal(res.plan.action, "submit")
  assert.equal(indexNowPosts(r.calls), 0)
  assert.ok(r.lines.some((l) => l.includes("DRY RUN — would POST 1 request(s) to https://api.indexnow.org/indexnow")))
})

test("real run: 200 → one POST; 202 → not a failure; 429 → stop, not a failure; 403/422 → exit 1", async () => {
  for (const [status, exit] of [[200, 0], [202, 0], [429, 0], [403, 1], [422, 1], [400, 1]] as const) {
    const r = recorder({ sitemapXml: TODAY_SITEMAP, postStatus: status })
    const res = await runIndexNow({ site: SITE, expectedCommit: HEAD, expectedCommitTime: NOW, dryRun: false, now: NOW, fetchFn: r.fetchFn, log: r.log })
    assert.equal(indexNowPosts(r.calls), 1, `status ${status}`)
    assert.equal(res.exitCode, exit, `status ${status}`)
  }
})

test("selection: yesterday's lastmod is included (late deploy), two days ago is not", () => {
  const entries = [
    { loc: "https://currencyversus.com/today/", lastmod: "2026-10-23" },
    { loc: "https://currencyversus.com/yesterday/", lastmod: "2026-10-22" },
    { loc: "https://currencyversus.com/two-days-ago/", lastmod: "2026-10-21" },
  ]
  const s = selectChangedUrls(entries, "2026-10-23", HOST)
  assert.deepEqual(s.urls, ["https://currencyversus.com/today/", "https://currencyversus.com/yesterday/"])
  // month and year boundaries
  assert.deepEqual(selectChangedUrls([{ loc: "https://currencyversus.com/a/", lastmod: "2026-10-31" }], "2026-11-01", HOST).urls, ["https://currencyversus.com/a/"])
  assert.deepEqual(selectChangedUrls([{ loc: "https://currencyversus.com/a/", lastmod: "2025-12-31" }], "2026-01-01", HOST).urls, ["https://currencyversus.com/a/"])
  console.log(`    lastmod 2026-10-23 → selected, 2026-10-22 → selected, 2026-10-21 → not selected`)
})
