// Per-page share image content (B6): src/lib/og-card.ts.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { currencyCard, metalCard, shareDownloadName, OG_CHART_BOX } from "./og-card.ts"
import type { ChartPeriod } from "./history.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

function tenYear(start: number, end: number): ChartPeriod {
  const points = [{ date: "2016-11-21", rate: start }, { date: "2021-06-01", rate: (start + end) / 3 }, { date: "2026-11-20", rate: end }]
  return { key: "10y", short: "10Y", months: 120, sampling: "monthly", requestedStart: "2016-11-21", start: points[0], startShifted: false, end: points[2], changePct: ((end - start) / start) * 100, low: points[1], high: points[2], coverageStart: null, points, observations: 3 }
}
const text = (c: ReturnType<typeof currencyCard>) => [c.eyebrow, c.title, c.codes, c.figure, c.change?.text, c.change?.label, c.range, ...c.dataLines, c.source, c.alt].filter(Boolean).join(" | ")

test("currency card: name, codes, rate, 10-year line and change, data date, source", () => {
  const c = currencyCard("USD", "TRY", "1 USD = 50.572 TRY", "2026-11-20", tenYear(3.3635, 50.572))
  console.log(`    ${text(c)}`)
  assert.equal(c.title, "US Dollar to Turkish Lira")
  assert.equal(c.codes, "USD / TRY")
  assert.deepEqual(c.change, { text: "+1403.55%", kind: "up", label: "Change in the USD/TRY rate over 10 years" })
  assert.equal(c.range, "2016-11 to 2026-11")
  assert.deepEqual(c.dataLines, ["ECB reference rate of 2026-11-20"])
  assert.match(c.source, /European Central Bank/)
  // the line spans the box top to bottom: Y axis [dataMin, dataMax]
  const ys = [...c.path!.matchAll(/[ML][\d.]+,([\d.]+)/g)].map((m) => Number(m[1]))
  assert.deepEqual([Math.min(...ys), Math.max(...ys)], [OG_CHART_BOX.padTop, OG_CHART_BOX.height - OG_CHART_BOX.padBottom])
})

test("direction: neutral kinds only, no arrow when the change rounds to 0.00%", () => {
  assert.equal(currencyCard("JPY", "KRW", null, null, tenYear(10.642, 8.443)).change!.kind, "down")
  const flat = currencyCard("EUR", "USD", null, null, tenYear(1.1, 1.10003)).change!
  assert.deepEqual([flat.kind, flat.text], ["unchanged", "0.00%"])
  // the renderer only knows the amber/teal tokens for direction
  const r = fs.readFileSync(path.join(SRC, "lib", "share-image.tsx"), "utf8")
  assert.match(r, /kind === "up" \? PV\.up : PV\.down/)
  assert.doesNotMatch(r, /#(10b981|ef4444|22c55e|dc2626)|\b(green|red|emerald)\b/i)
})

test("metal cards: price per troy ounce with provider time; conversion date only when converted", () => {
  const usd = metalCard("XAU", "USD", "1 troy oz Gold = 3,539.00 USD", "2026-11-21T08:57:12Z", null)
  assert.equal(usd.title, "Gold price in US Dollar")
  assert.deepEqual(usd.dataLines, ["Price time 2026-11-21 08:57 UTC (provider)"])
  assert.equal(usd.source, "Source: gold-api.com")
  assert.equal(usd.path, null)
  const tr = metalCard("XAU", "TRY", "1 troy oz Gold = 178,975 TRY", "2026-11-21T08:57:12Z", "2026-11-20")
  assert.deepEqual(tr.dataLines, ["Price time 2026-11-21 08:57 UTC (provider)", "Converted at the ECB reference rate of 2026-11-20"])
  assert.match(tr.source, /gold-api\.com, European Central Bank/)
  assert.equal(metalCard("XAU", "XAG", "1 oz Gold = 86.149 oz Silver", "2026-11-21T08:57:12Z", null).title, "Gold/silver ratio")
})

test("no investment-result wording, and plain ASCII on the image (no glyph the image font lacks)", () => {
  const cards = [
    currencyCard("USD", "TRY", "1 USD = 50.572 TRY", "2026-11-20", tenYear(3.3635, 50.572)),
    currencyCard("JPY", "KRW", "1 JPY = 8.4430 KRW", "2026-11-20", tenYear(10.642, 8.443)),
    metalCard("XPD", "GBP", "1 troy oz Palladium = 701.50 GBP", "2026-11-21T08:57:12Z", "2026-11-20"),
    // a label with characters the image font lacks (em dash, lira sign): stripped, not drawn
    metalCard("XAU", "TRY", "1 troy oz Gold — 178,975 ₺", "2026-11-21T08:57:12Z", "2026-11-20"),
  ]
  for (const c of cards) {
    const shown = text({ ...c, alt: "" })
    assert.doesNotMatch(shown, /\b(return|returns|profit|gain|gains|loss|losses|invest|investment|earn|earned|grew your|would have)\b/i, shown)
    assert.match(shown, /^[\x20-\x7E| ]*$/, `non-ASCII text on the image: ${shown}`)
  }
})

test("share image wiring: a .png route prerendered for every page, named in og:image and twitter:image with its alt", () => {
  const route = fs.readFileSync(path.join(SRC, "app", "(en)", "[pair]", "share.png", "route.tsx"), "utf8")
  assert.match(route, /export const dynamic = "force-static"/)
  assert.match(route, /routeCatalog\(\)\.map\(\(pair\) => \(\{ pair \}\)\)/)
  const page = fs.readFileSync(path.join(SRC, "app", "(en)", "[pair]", "page.tsx"), "utf8")
  assert.match(page, /url: `https:\/\/currencyversus\.com\/\$\{slug\}\/share\.png`/)
  assert.equal((page.match(/images: share\.openGraph\.images/g) ?? []).length, 3) // currency, ratio, metal
  assert.equal((page.match(/images: share\.twitter\.images/g) ?? []).length, 3)
  assert.doesNotMatch(page, /logo\.png/)
  assert.match(fs.readFileSync(path.join(SRC, "..", "scripts", "verify-routes.mjs"), "utf8"), /share images —/)
})

test("download name: the page and the image's own data date (ECB date; the metal provider's UTC day)", () => {
  const fx = currencyCard("USD", "TRY", "1 USD = 50.572 TRY", "2026-11-20", tenYear(3.3635, 50.572))
  const gold = metalCard("XAU", "TRY", "1 troy oz Gold = 178,975 TRY", "2026-11-21T08:57:12Z", "2026-11-20")
  assert.equal(fx.date, "2026-11-20")
  assert.equal(gold.date, "2026-11-21") // the price's day, not the conversion rate's
  assert.equal(shareDownloadName("usd-vs-try", fx.date), "usd-vs-try-2026-11-20.png")
  assert.equal(shareDownloadName("gold-vs-try", gold.date), "gold-vs-try-2026-11-21.png")
  assert.equal(shareDownloadName("eur-vs-usd", null), "eur-vs-usd.png") // no date → no made-up one
  assert.equal(shareDownloadName("eur-vs-usd", "20 Nov"), "eur-vs-usd.png")
})

test("download link: every pair and metal page offers its own share.png (no new image), a plain <a download>, 44px", () => {
  const page = fs.readFileSync(path.join(SRC, "app", "(en)", "[pair]", "page.tsx"), "utf8")
  assert.match(page, /href: `\/\$\{slug\}\/share\.png`, fileName: shareDownloadName\(slug, card\?\.date \?\? null\)/)
  assert.equal((page.match(/shareImage=\{shareImage\}/g) ?? []).length, 3) // currency, ratio and metal pages
  for (const [f, kind] of [["PilotPairPageClient.tsx", "chart"], ["MetalPageClient.tsx", "price"], ["MetalRatioPageClient.tsx", "price"]]) {
    const c = fs.readFileSync(path.join(SRC, "app", "(en)", "[pair]", f), "utf8")
    assert.match(c, new RegExp(`<ShareImageLink image=\{shareImage\} kind="${kind}" />`), f)
  }
  const link = fs.readFileSync(path.join(SRC, "components", "ShareImageLink.tsx"), "utf8")
  assert.match(link, /<a\s+href=\{image\.href\}\s+download=\{image\.fileName\}/)
  assert.match(link, /min-h-\[44px\]/)
  assert.doesNotMatch(link, /from "next\/(link|og)"/) // a file link, not a page link; draws nothing
})
