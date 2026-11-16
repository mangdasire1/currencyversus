// Metal prices are shown at the precision their source publishes
// (METAL_PRICE_DECIMALS in src/lib/metal-units.ts): home cards, metal pages.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { formatCardUsd } from "./metal-cards.ts"
import { METAL_PRICE_DECIMALS, metalPriceSignificant, formatSignificant, valueOfWeight } from "./metal-units.ts"
import { computeConversion } from "./conversion.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
// gold-api responses of 2026-11-16 (float32 renderings of 3875.3, 47.465, 1477.4, 983.5)
const PRICES = { XAU: 3875.300049, XAG: 47.465, XPT: 1477.400024, XPD: 983.5 } as const
const CODES = ["XAU", "XAG", "XPT", "XPD"] as const

test("per-symbol decimals: gold 1, silver 3, platinum 1, palladium 1", () => {
  assert.deepEqual(METAL_PRICE_DECIMALS, { XAU: 1, XAG: 3, XPT: 1, XPD: 1 })
  assert.deepEqual(CODES.map((c) => metalPriceSignificant(c, PRICES[c])), [5, 5, 5, 4])
  assert.equal(formatSignificant(1000, metalPriceSignificant("XPD", 1000)), "1,000.0") // a whole-number day keeps the published decimal
  // the significant digits follow the price's size: gold above 10,000 keeps its one decimal
  assert.equal(formatSignificant(10250.4, metalPriceSignificant("XAU", 10250.4)), "10,250.4")
  assert.equal(formatSignificant(99.5, metalPriceSignificant("XPT", 99.5)), "99.5")
})

test("price per troy ounce: exactly the published decimals — no padded digit, none dropped", () => {
  const oz = CODES.map((c) => formatCardUsd(PRICES[c], c, PRICES[c]))
  console.log(`    per oz: ${oz.join("  ")}`)
  assert.deepEqual(oz, ["$3,875.3", "$47.465", "$1,477.4", "$983.5"])
  // the 2026-11-08 gold price: neither "4,072.10" (old metal pages) nor "4,072" (old card)
  assert.equal(formatCardUsd(4072.100098, "XAU", 4072.100098), "$4,072.1")
})

test("derived values never carry more significant digits than the source price", () => {
  const digits = (s: string) => s.replace(/[^0-9]/g, "").replace(/^0+/, "").length
  for (const c of CODES) {
    const sig = metalPriceSignificant(c, PRICES[c])
    for (const unit of ["g", "kg", "oz"] as const) {
      const text = formatSignificant(valueOfWeight(1, unit, PRICES[c]), sig)
      const intDigits = text.split(".")[0].replace(/[^0-9]/g, "").replace(/^0+/, "").length
      // integer digits are always kept; decimals only while within the source's digits
      assert.ok(digits(text) <= Math.max(sig, intDigits), `${c} 1 ${unit} = ${text} (source: ${sig} significant digits)`)
    }
  }
  const g = CODES.map((c) => formatCardUsd(PRICES[c] / 31.1034768, c, PRICES[c]))
  console.log(`    per g:  ${g.join("  ")}`)
  assert.deepEqual(g, ["$124.59", "$1.5260", "$47.500", "$31.62"])
  assert.equal(formatSignificant(valueOfWeight(1, "kg", PRICES.XAU), 5), "124,594") // no cents at that size
})

test("conversion labels: the metal price in the headline uses the same rule, in USD and through an FX leg", () => {
  const metal = (code: string) => ({ [code]: { metal: code, usdPerOz: PRICES[code as keyof typeof PRICES], priceTime: null, fetchedAt: null, stale: false, staleAgeMs: null } })
  const usd = (code: string, unit: "oz" | "g") => computeConversion({ base: code, quote: "USD", amount: 1, metalUnit: unit, fx: null, metals: metal(code), fxLoading: false, metalLoading: false })
  assert.equal(usd("XAU", "oz").rateLabel, "1 oz Gold = 3,875.3 USD")
  assert.equal(usd("XAG", "oz").rateLabel, "1 oz Silver = 47.465 USD")
  assert.equal(usd("XPT", "oz").rateLabel, "1 oz Platinum = 1,477.4 USD")
  assert.equal(usd("XPD", "oz").rateLabel, "1 oz Palladium = 983.5 USD")
  assert.equal(usd("XAU", "g").rateLabel, "1 g Gold = 124.59 USD")
  assert.equal(usd("XAU", "oz").significant, 5)
  // another currency: also limited by the ECB leg, cents dropped at this size
  const tryFx = { base: "USD", quote: "TRY", rate: 42.271, date: "2026-11-13", fetchedAt: null, stale: false, staleAgeMs: null }
  const inTry = computeConversion({ base: "XAU", quote: "TRY", amount: 1, metalUnit: "oz", fx: tryFx, metals: metal("XAU"), fxLoading: false, metalLoading: false })
  assert.equal(inTry.rateLabel, "1 oz Gold = 163,813 TRY")
  // currency pairs are untouched: no metal precision involved
  const fx = computeConversion({ base: "USD", quote: "TRY", amount: 1, metalUnit: "g", fx: tryFx, metals: {}, fxLoading: false, metalLoading: false })
  assert.equal(fx.significant, null)
  assert.equal(fx.rateLabel, "1 USD = 42.271 TRY")
})

test("pages use the shared rule: no fixed decimals for metal prices on the home cards or the metal pages", () => {
  const home = fs.readFileSync(path.join(SRC, "app", "HomeClient.tsx"), "utf8")
  assert.match(home, /\{usd !== null \? formatCardUsd\(usd, code, usd\) : "—"\}/)
  assert.match(home, /\$\{formatCardUsd\(gram, code, usd\)\} \/ g/)
  const page = fs.readFileSync(path.join(SRC, "app", "[pair]", "MetalPageClient.tsx"), "utf8")
  assert.doesNotMatch(page, /formatMoney|ozDecimals|gramDecimals|toFixed\(2\)/)
  assert.match(page, /const formatMetal = \(value: number\) => formatSignificant\(value, resultSignificant\)/)
  const ratio = fs.readFileSync(path.join(SRC, "app", "[pair]", "MetalRatioPageClient.tsx"), "utf8")
  assert.doesNotMatch(ratio, /maximumFractionDigits/)
})
