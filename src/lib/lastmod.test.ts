import { test } from "node:test"
import assert from "node:assert/strict"
import { fingerprint, visibleContent, nextManifest, sitemapXml, isManifest } from "./lastmod.ts"

const page = (rate: string, ecbDate: string, providerTime = "2026-10-22 13:05 UTC") =>
  `<html><head><script>self.__next_f.push(["build-${Math.random()}"])</script></head><body>
   <h1>USD vs TRY</h1><p>1 USD = ${rate} TRY</p><p>ECB reference rate of <!-- -->${ecbDate}</p>
   <p>Provider&#x27;s last update: <!-- -->${providerTime}<!-- --> · Source: gold-api.com</p></body></html>`

test("fingerprint ignores scripts/build ids and the metal provider's poll time", () => {
  const a = fingerprint(page("49.6020", "2026-10-21", "2026-10-22 13:05 UTC"))
  const b = fingerprint(page("49.6020", "2026-10-21", "2026-10-22 18:41 UTC"))
  assert.equal(a, b)
  assert.doesNotMatch(visibleContent(page("49.6020", "2026-10-21")), /next_f|build-/)
})

test("fingerprint changes when a price or a data date changes (new ECB observation)", () => {
  const base = fingerprint(page("49.6020", "2026-10-21"))
  assert.notEqual(fingerprint(page("49.6280", "2026-10-21")), base)
  // Same rate, but a new ECB business day was published: a real new observation.
  assert.notEqual(fingerprint(page("49.6020", "2026-10-22")), base)
})

test("same content rebuilt → previous lastmod carried, not moved to today", () => {
  const prev = { "/usd-vs-try/": { fingerprint: "abc", lastmod: "2026-10-01" } }
  const { manifest, summary } = nextManifest(prev, { "/usd-vs-try/": "abc" }, "2026-10-22")
  assert.equal(manifest["/usd-vs-try/"].lastmod, "2026-10-01")
  assert.deepEqual(summary, { carried: 1, changed: 0, added: 0, unknown: 0 })
})

test("changed content → today; new URL → today", () => {
  const prev = { "/usd-vs-try/": { fingerprint: "abc", lastmod: "2026-10-01" } }
  const { manifest, summary } = nextManifest(prev, { "/usd-vs-try/": "xyz", "/new-page/": "n1" }, "2026-10-22")
  assert.equal(manifest["/usd-vs-try/"].lastmod, "2026-10-22")
  assert.equal(manifest["/new-page/"].lastmod, "2026-10-22")
  assert.deepEqual(summary, { carried: 0, changed: 1, added: 1, unknown: 0 })
})

test("no previous manifest → no lastmod at all (never a made-up date)", () => {
  const { manifest, summary } = nextManifest(null, { "/": "a", "/usd-vs-try/": "b" }, "2026-10-22")
  assert.equal(manifest["/"].lastmod, null)
  assert.equal(summary.unknown, 2)
  const xml = sitemapXml("https://currencyversus.com", manifest, ["/", "/usd-vs-try/"])
  assert.doesNotMatch(xml, /<lastmod>/)
  assert.match(xml, /<loc>https:\/\/currencyversus.com\/usd-vs-try\/<\/loc>/)
})

test("unknown date stays unknown while content is unchanged, becomes real at the first change", () => {
  const prev = { "/a/": { fingerprint: "f1", lastmod: null } }
  assert.equal(nextManifest(prev, { "/a/": "f1" }, "2026-10-22").manifest["/a/"].lastmod, null)
  assert.equal(nextManifest(prev, { "/a/": "f2" }, "2026-10-23").manifest["/a/"].lastmod, "2026-10-23")
})

test("manifest validator rejects malformed input", () => {
  assert.equal(isManifest({ "/a/": { fingerprint: "x", lastmod: "2026-10-22" } }), true)
  assert.equal(isManifest({ "/a/": { fingerprint: "x", lastmod: "yesterday" } }), false)
  assert.equal(isManifest([]), false)
  assert.equal(isManifest("<html>404</html>"), false)
})
