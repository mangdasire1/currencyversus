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
// gold-api responses of 2026-11-16 06:11 UTC, market open (float32 renderings
// of 3854.45, 47.453, 1475.75, 982.25)
const PRICES = { XAU: 3854.449951, XAG: 47.452999, XPT: 1475.75, XPD: 982.25 } as const
const CODES = ["XAU", "XAG", "XPT", "XPD"] as const

test("per-symbol decimals: gold 2, silver 3, platinum 2, palladium 2", () => {
  assert.deepEqual(METAL_PRICE_DECIMALS, { XAU: 2, XAG: 3, XPT: 2, XPD: 2 })
  assert.deepEqual(CODES.map((c) => metalPriceSignificant(c, PRICES[c])), [6, 5, 6, 5])
  // readings that end in zeros keep the published decimals (3887.6, 1492.2, 983.5 were such readings)
  assert.equal(formatSignificant(3887.600098, metalPriceSignificant("XAU", 3887.600098)), "3,887.60")
  assert.equal(formatSignificant(1000, metalPriceSignificant("XPD", 1000)), "1,000.00")
  // the significant digits follow the price's size: gold above 10,000 keeps its two decimals
  assert.equal(formatSignificant(10250.45, metalPriceSignificant("XAU", 10250.45)), "10,250.45")
  assert.equal(formatSignificant(99.55, metalPriceSignificant("XPT", 99.55)), "99.55")
})

test("price per troy ounce: exactly the published decimals — no padded digit, none dropped", () => {
  const oz = CODES.map((c) => formatCardUsd(PRICES[c], c, PRICES[c]))
  console.log(`    per oz: ${oz.join("  ")}`)
  assert.deepEqual(oz, ["$3,854.45", "$47.453", "$1,475.75", "$982.25"])
  // rounded to the published digit, never further: 3854.449951 is 3854.45, not 3854.4
  assert.equal(formatCardUsd(3842.25, "XAU", 3842.25), "$3,842.25")
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
  assert.deepEqual(g, ["$123.923", "$1.5256", "$47.4465", "$31.580"])
  assert.equal(formatSignificant(valueOfWeight(1, "kg", PRICES.XAU), 6), "123,923") // no cents at that size
})

test("conversion labels: the metal price in the headline uses the same rule, in USD and through an FX leg", () => {
  const metal = (code: string) => ({ [code]: { metal: code, usdPerOz: PRICES[code as keyof typeof PRICES], priceTime: null, fetchedAt: null, stale: false, staleAgeMs: null } })
  const usd = (code: string, unit: "oz" | "g") => computeConversion({ base: code, quote: "USD", amount: 1, metalUnit: unit, fx: null, metals: metal(code), fxLoading: false, metalLoading: false })
  assert.equal(usd("XAU", "oz").rateLabel, "1 oz Gold = 3,854.45 USD")
  assert.equal(usd("XAG", "oz").rateLabel, "1 oz Silver = 47.453 USD")
  assert.equal(usd("XPT", "oz").rateLabel, "1 oz Platinum = 1,475.75 USD")
  assert.equal(usd("XPD", "oz").rateLabel, "1 oz Palladium = 982.25 USD")
  assert.equal(usd("XAU", "g").rateLabel, "1 g Gold = 123.923 USD")
  assert.equal(usd("XAU", "oz").significant, 6)
  // another currency: also limited by the ECB leg, cents dropped at this size
  const tryFx = { base: "USD", quote: "TRY", rate: 42.271, date: "2026-11-13", fetchedAt: null, stale: false, staleAgeMs: null }
  const inTry = computeConversion({ base: "XAU", quote: "TRY", amount: 1, metalUnit: "oz", fx: tryFx, metals: metal("XAU"), fxLoading: false, metalLoading: false })
  assert.equal(inTry.rateLabel, "1 oz Gold = 162,931 TRY")
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

test("gold/silver page: the ratio is shown by one rule everywhere (headline, converter, large figure, Quick Stats)", () => {
  const page = fs.readFileSync(path.join(SRC, "app", "[pair]", "MetalRatioPageClient.tsx"), "utf8")
  assert.doesNotMatch(page, /ratio\.toFixed\(/)
  assert.match(page, /const formatRatio = \(r: number\) => formatSignificant\(r, ratioSignificant\)/)
  assert.equal((page.match(/formatRatio\(ratio\)/g) ?? []).length, 3)
  assert.match(page, /significant=\{ratioSignificant\}/) // the converter uses the same digits
  // 2026-11-21: gold 3,539.00 (6 significant digits) / silver 41.080 (5) → 5 digits
  const sig = Math.min(metalPriceSignificant("XAU", 3539.0), metalPriceSignificant("XAG", 41.08))
  assert.equal(formatSignificant(3539.0 / 41.08, sig), "86.149")
})
