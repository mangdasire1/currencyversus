// The /metals/ index page (Phase A6): what it links to and the build check.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { metalsIndex, metalsIndexTargets, RATIO_LINK, METALS_INDEX_PATH } from "./metals-index.ts"
import { checkMetalsIndexHtml } from "./metal-page-check.ts"
import { routeCatalog } from "./routes.ts"
import { MEASUREMENT_COHORT, CONTROL_PAGES } from "./pilot.ts"
import { fingerprint } from "./lastmod.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const METALS = [{ name: "Gold", code: "XAU" }, { name: "Silver", code: "XAG" }, { name: "Platinum", code: "XPT" }, { name: "Palladium", code: "XPD" }]

test("metals index: links every metal page the build generates, and only generated pages", () => {
  const entries = metalsIndex()
  assert.deepEqual(entries.map((e) => `${e.name} ${e.links.length}`), ["Gold 15", "Silver 15", "Platinum 4", "Palladium 4"])
  const catalog = new Set(routeCatalog())
  const metalPages = [...catalog].filter((s) => /^(gold|silver|platinum|palladium)-vs-/.test(s))
  const targets = metalsIndexTargets()
  console.log(`    ${targets.length} targets (${metalPages.length} metal pages in the route catalog, ratio page included)`)
  assert.deepEqual([...targets].map((t) => t.slice(1, -1)).sort(), [...metalPages].sort()) // nothing missing, nothing extra
  const measured = new Set<string>([...MEASUREMENT_COHORT, ...CONTROL_PAGES])
  for (const t of targets) assert.ok(!measured.has(t.slice(1, -1)), `${t} is a measured page`)
  for (const e of entries) for (const l of e.links) assert.match(l.text, new RegExp(`^${e.name} price in .+ \\(${l.currency}\\)$`))
  assert.equal(RATIO_LINK.href, "/gold-vs-silver/")
  assert.equal(METALS_INDEX_PATH, "/metals/")
})

const indexHtml = (prices: Record<string, string>, links: string[], providerTime = "2026-11-16 05:47 UTC") =>
  `<body><h1>Gold, silver, platinum and palladium prices</h1>${METALS.map(
    (m) => `<section><h2>${m.name}<!-- --> (<!-- -->${m.code}<!-- -->)</h2><p>${prices[m.code] ?? ""} USD <span>per troy ounce</span></p>` +
      `<p><span>Provider update</span> <span>${providerTime}</span></p></section>`
  ).join("")}${links.map((h) => `<a href="${h}">x</a>`).join("")}<script>self.__next_f.push(["<a href=\\"/gold-vs-usd/\\">"])</script></body>`
const PRICES = { XAU: "3,863.3", XAG: "47.435", XPT: "1,480.2", XPD: "985.8" }

test("metals index build check: passes with four prices and all links; fails on a missing price or link", () => {
  const targets = metalsIndexTargets()
  const ok = checkMetalsIndexHtml(indexHtml(PRICES, targets), METALS, targets)
  assert.deepEqual(ok.problems, [])
  assert.deepEqual(ok.prices, ["Gold 3,863.3", "Silver 47.435", "Platinum 1,480.2", "Palladium 985.8"])
  // palladium fetch failed at build time
  const noPrice = checkMetalsIndexHtml(indexHtml({ ...PRICES, XPD: "" }, targets), METALS, targets)
  assert.deepEqual(noPrice.problems, ['no Palladium price ("Palladium (XPD) … USD per troy ounce")'])
  // a zero is not a price
  assert.equal(checkMetalsIndexHtml(indexHtml({ ...PRICES, XAU: "0" }, targets), METALS, targets).problems.length, 1)
  // a link only inside a script (not an <a> in the HTML) does not count
  const noLink = checkMetalsIndexHtml(indexHtml(PRICES, targets.filter((t) => t !== "/gold-vs-usd/")), METALS, targets)
  assert.deepEqual(noLink.problems, ["1 metal page(s) not linked: /gold-vs-usd/"])
})

test("metals index: in the sitemap, and its provider times do not count as a content change", () => {
  const sitemapScript = fs.readFileSync(path.join(SRC, "..", "scripts", "sitemap-lastmod.mjs"), "utf8")
  assert.match(sitemapScript, /const urls = \["\/", "\/method\/", "\/metals\/",/)
  const targets = metalsIndexTargets()
  const a = fingerprint(indexHtml(PRICES, targets, "2026-11-16 05:47 UTC"))
  assert.equal(fingerprint(indexHtml(PRICES, targets, "2026-11-17 05:47 UTC")), a) // weekend poll, same prices
  assert.notEqual(fingerprint(indexHtml({ ...PRICES, XAU: "3,870.0" }, targets)), a) // a price moved
})

test("metals index page: server-rendered from build-time prices, linked from the home menu and from every metal page", () => {
  const page = fs.readFileSync(path.join(SRC, "app", "metals", "page.tsx"), "utf8")
  assert.doesNotMatch(page, /"use client"|useEffect|useState/) // nothing waits for JavaScript
  assert.match(page, /getBuildTimeMetalPrice\(/)
  assert.match(page, /canonical: "https:\/\/currencyversus\.com\/metals\/"/)
  assert.match(page, /formatSignificant\(price, sig\)/) // the same precision rule as the metal pages
  for (const m of page.matchAll(/<Link\b[\s\S]*?>/g)) assert.match(m[0], /min-h-\[44px\]/, m[0])
  assert.match(fs.readFileSync(path.join(SRC, "components", "Header.tsx"), "utf8"), /\{ href: "\/metals\/", label: "Metals" \}/)
  const verify = fs.readFileSync(path.join(SRC, "..", "scripts", "verify-metals.mjs"), "utf8")
  assert.match(verify, /checkMetalsIndexHtml\(/)
})
