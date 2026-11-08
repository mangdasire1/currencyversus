// Home page metal cards: one precision rule (src/lib/metal-cards.ts).
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { CARD_SIGNIFICANT, cardDecimals, formatCardUsd } from "./metal-cards.ts"
import { METAL_SIGNIFICANT } from "./metal-units.ts"

const OZ_TO_GRAM = 31.1034768

test("cards: 4 significant digits — the least precise source — never above any source's precision", () => {
  assert.equal(CARD_SIGNIFICANT, 4)
  for (const sig of Object.values(METAL_SIGNIFICANT)) assert.ok(CARD_SIGNIFICANT <= sig)
})

test("cards: the four prices of 2026-11-08 under one rule (no padded cent on gold)", () => {
  const prices = { XAU: 4072.100098, XAG: 52.070999, XPT: 1544.0, XPD: 1044.0 }
  const oz = Object.values(prices).map(formatCardUsd)
  const g = Object.values(prices).map((p) => formatCardUsd(p / OZ_TO_GRAM))
  console.log(`    per oz: ${oz.join("  ")}   per g: ${g.join("  ")}`)
  assert.deepEqual(oz, ["$4,072", "$52.07", "$1,544", "$1,044"])
  assert.deepEqual(g, ["$130.9", "$1.67", "$49.64", "$33.57"])
})

test("cards: integer digits never dropped, at most 2 decimals", () => {
  assert.equal(formatCardUsd(12345.678), "$12,346")
  assert.equal(cardDecimals(0.4567), 2)
  assert.equal(formatCardUsd(0.4567), "$0.46")
  assert.equal(cardDecimals(999.99), 1)
})

test("home: every metal card line uses formatCardUsd (one rule for all four)", () => {
  const home = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "HomeClient.tsx"), "utf8")
  assert.match(home, /\{usd !== null \? formatCardUsd\(usd\) : "—"\}/)
  assert.match(home, /\$\{formatCardUsd\(gram\)\} \/ g/)
  assert.doesNotMatch(home, /METAL_SIGNIFICANT|usdDecimals/) // no per-metal precision on the cards
})
