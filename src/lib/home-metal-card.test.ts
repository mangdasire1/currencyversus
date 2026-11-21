// Home page right column with a metal selected (src/components/HomeMetalCard.tsx).
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { selectedMetal, metalPagePath } from "./home-metal-card.ts"
import { routeCatalog } from "./routes.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

test("which metal: base side first; none for a currency pair", () => {
  assert.equal(selectedMetal("XAU", "TRY"), "XAU")
  assert.equal(selectedMetal("EUR", "XPT"), "XPT")
  assert.equal(selectedMetal("XAU", "XAG"), "XAU")
  assert.equal(selectedMetal("USD", "EUR"), null)
})

test("link: the metal's page in the other currency when it exists, else in US dollars — always a generated page", () => {
  assert.equal(metalPagePath("XAU", "TRY"), "/gold-vs-try/")
  assert.equal(metalPagePath("XPT", "GBP"), "/platinum-vs-gbp/")
  assert.equal(metalPagePath("XPT", "JPY"), "/platinum-vs-usd/") // platinum has no JPY page
  assert.equal(metalPagePath("XAU", "XAG"), "/gold-vs-usd/")
  const catalog = new Set(routeCatalog())
  for (const m of ["XAU", "XAG", "XPT", "XPD"]) for (const o of ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "TRY", "CNY", "INR", "BRL", "KRW", "SEK", "MXN", "SGD", "XAU", "XAG", "XPT", "XPD"]) {
    if (m === o) continue
    const p = metalPagePath(m, o)
    assert.ok(catalog.has(p.slice(1, -1)), `${m}/${o} → ${p}`)
  }
})

test("home: the column is never empty — chart for a currency pair, the metal card when a metal is selected", () => {
  const home = fs.readFileSync(path.join(SRC, "app", "(en)", "HomeClient.tsx"), "utf8")
  assert.match(home, /const metalOnSide = selectedMetal\(base, target\)/)
  assert.match(home, /\{metalOnSide && \(\s*<HomeMetalCard/)
  assert.match(home, /\{fxPair && \(/)
})

test("metal card: the cards' prices and rule, the existing unit note and a link — no new figure or claim", () => {
  const card = fs.readFileSync(path.join(SRC, "components", "HomeMetalCard.tsx"), "utf8")
  assert.match(card, /formatCardUsd\(usdPerOz, metal, usdPerOz\)/) // same rule as the Precious Metals cards
  assert.match(card, /formatCardUsd\(usdPerOz \/ OZ_TO_GRAM, metal, usdPerOz\)/)
  // the unit note, word for word as on the metals page
  const metals = fs.readFileSync(path.join(SRC, "app", "(en)", "metals", "page.tsx"), "utf8").replace(/\s+/g, " ")
  const note = "Precious metals are priced per troy ounce ("
  assert.ok(metals.includes(note) && card.replace(/\s+/g, " ").includes(note))
  assert.ok(card.replace(/\s+/g, " ").includes("The ounce used for food is the avoirdupois ounce ({GRAMS_PER_AVOIRDUPOIS_OUNCE} g), which is lighter."))
  // the "no history" sentence matches the method page's statement
  assert.match(fs.readFileSync(path.join(SRC, "app", "(en)", "method", "page.tsx"), "utf8"), /The site has no historical metal prices/)
  assert.match(card, /The site has no historical metal prices, so there is no chart\./)
  // no digits written into the card's text: every number comes from data or a unit constant
  const text = card.replace(/\{[^}]*\}/g, "").replace(/className="[^"]*"/g, "").replace(/\/\/.*$/gm, "").replace(/<[^>]+>/g, " ")
  assert.doesNotMatch(text, /\d/, text)
  assert.match(card, /<Link href=\{href\} className="inline-flex items-center min-h-\[44px\]/)
})
