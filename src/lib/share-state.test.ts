// The pair page's share link (B4): what the address carries and how it is read.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readShareState, shareQuery, sharedLinkNote, shareFieldCount, SHARE_DEFAULT_AMOUNT } from "./share-state.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const D = { period: "10y", from: "2016-11-21", periods: ["1m", "3m", "6m", "1y", "3y", "5y", "10y"], today: "2026-11-21" }

test("share link: defaults are left out; a changed view round-trips through the address", () => {
  const base = { amount: SHARE_DEFAULT_AMOUNT, period: "10y", from: "2016-11-21", to: null }
  assert.equal(shareQuery(base, D), "") // the plain page address
  const view = { amount: "2500.5", period: "1y", from: "2016-10-23", to: "2024-03-16" }
  const q = shareQuery(view, D)
  assert.equal(q, "?amount=2500.5&period=1y&from=2016-10-23&to=2024-03-16")
  assert.deepEqual(readShareState(q, D), { state: view, found: true, ignored: [] })
  assert.equal(shareQuery({ ...base, to: null, amount: "50" }, D), "?amount=50") // second date today: no "to"
})

test("share link: invalid fields are ignored, never guessed; a plain address carries nothing", () => {
  assert.deepEqual(readShareState("", D), { state: { amount: "100", period: "10y", from: "2016-11-21", to: null }, found: false, ignored: [] })
  const bad = readShareState("?amount=-5&period=2w&from=1998-12-31&to=2030-01-01", D)
  assert.equal(bad.found, true)
  assert.deepEqual(bad.ignored, ["amount", "period", "from", "to"])
  assert.deepEqual(bad.state, { amount: "100", period: "10y", from: "2016-11-21", to: null })
  assert.deepEqual(readShareState("?from=2026-02-30", D).ignored, ["from"]) // not a real date
  assert.equal(readShareState("?to=2026-11-21", D).state.to, null) // today is the default
  assert.equal(readShareState("?amount=1e400", D).ignored[0], "amount") // same policy as every amount field
})

test("share link: the opened page says whether today's rate is recalculated or both dates are fixed — and claims only what it applied", () => {
  const today = { amount: "100", period: "10y", from: "2016-11-21", to: null }
  assert.match(sharedLinkNote(today, [], 2), /second value uses today's ECB reference rate, so it can differ/)
  assert.match(sharedLinkNote({ ...today, to: "2024-03-15" }, [], 4), /both dates are fixed/)
  // every field invalid: nothing was applied, so nothing is called "as shared"
  const all = readShareState("?amount=-5&period=2w&from=2026-02-30&to=2099-01-01", D)
  assert.equal(sharedLinkNote(all.state, all.ignored, shareFieldCount("?amount=-5&period=2w&from=2026-02-30&to=2099-01-01")), "This link's settings were not valid, so the page shows its defaults.")
  // some fields invalid: say which were ignored
  const some = readShareState("?amount=300&from=2026-02-30", D)
  assert.match(sharedLinkNote(some.state, some.ignored, 2), /Parts of the link that were not valid were ignored \(from\)\./)
})

test("share link: read after mount from window.location (static HTML unchanged), written with replaceState, nothing sent", () => {
  const page = fs.readFileSync(path.join(SRC, "app", "(en)", "[pair]", "PilotPairPageClient.tsx"), "utf8")
  assert.match(page, /readShareState\(window\.location\.search,/) // in an effect: server and first render use the defaults
  assert.doesNotMatch(page, /useSearchParams/) // would opt the page out of prerendering
  assert.match(page, /window\.history\.replaceState\(/)
  assert.doesNotMatch(page, /pushState/)
  const tool = fs.readFileSync(path.join(SRC, "components", "pilot", "TwoDatesTool.tsx"), "utf8")
  assert.match(tool, /navigator\.clipboard\.writeText\(url\)/)
  assert.match(tool, /Share this comparison/)
  // the amount goes to the clipboard and the address bar only: no request carries it
  for (const f of [page, tool]) assert.doesNotMatch(f, /sendBeacon|fetch\([^)]*amount|gtag|plausible|zaraz/)
  // the canonical is the plain page address, the sitemap lists plain addresses
  // (alternatesFor gives the canonical: the site address + this path, no query — tr-pages.test.ts)
  assert.match(fs.readFileSync(path.join(SRC, "app", "(en)", "[pair]", "page.tsx"), "utf8"), /alternates: alternatesFor\(`\/\$\{base\.toLowerCase\(\)\}-vs-\$\{target\.toLowerCase\(\)\}\/`\)/)
  assert.match(fs.readFileSync(path.join(SRC, "lib", "tr-pages.ts"), "utf8"), /canonical: `\$\{SITE\}\$\{path\}`/)
  const urlList = fs.readFileSync(path.join(SRC, "..", "scripts", "sitemap-lastmod.mjs"), "utf8").match(/const urls = \[.*\]/)![0]
  assert.doesNotMatch(urlList, /\?/)
})
