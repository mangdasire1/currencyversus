import { test } from "node:test"
import assert from "node:assert/strict"
import { computeConversion, convertMetalUnits, fxForPair } from "./conversion.ts"
import type { FxQuote, MetalQuote } from "./conversion.ts"

const USD_EUR: FxQuote = { base: "USD", quote: "EUR", rate: 0.88, date: "2026-10-16" }
const USD_TRY: FxQuote = { base: "USD", quote: "TRY", rate: 41.7, date: "2026-10-16" }
const XAU: MetalQuote = { metal: "XAU", usdPerOz: 4166.100098, priceTime: "2026-10-17T11:59:11.000Z" }
const XAG: MetalQuote = { metal: "XAG", usdPerOz: 52.3, priceTime: "2026-10-17T11:58:40.000Z" }

test("EUR→EUR, 1 → rate 1, amount 1, label '1 EUR = 1 EUR'", () => {
  const r = computeConversion({ base: "EUR", quote: "EUR", amount: 1 })
  assert.equal(r.rate, 1)
  assert.equal(r.inverseRate, 1)
  assert.equal(r.amount, 1)
  assert.equal(r.rateLabel, "1 EUR = 1 EUR")
  assert.equal(r.status, "ready")
})

test("USD→EUR then EUR→EUR: second result is 1, not the leftover 0.88", () => {
  const first = computeConversion({ base: "USD", quote: "EUR", amount: 1, fx: USD_EUR })
  assert.equal(first.rate, 0.88)
  // Same (now stale) fx object still lying around in state:
  const second = computeConversion({ base: "EUR", quote: "EUR", amount: 1, fx: USD_EUR })
  assert.equal(second.rate, 1)
  assert.equal(second.amount, 1)
  assert.notEqual(second.rate, 0.88)
})

test("pair identity: FX for another pair is never used", () => {
  assert.equal(fxForPair(USD_EUR, "EUR", "GBP"), null)
  const r = computeConversion({ base: "EUR", quote: "GBP", amount: 1, fx: USD_EUR, fxLoading: true })
  assert.equal(r.rate, null)
  assert.equal(r.status, "loading")
})

test("1 troy oz → gram = 31.1034768", () => {
  assert.equal(convertMetalUnits(1, "oz", "g"), 31.1034768)
  const r = computeConversion({ base: "XAU", quote: "XAU", baseMetalUnit: "oz", quoteMetalUnit: "g", amount: 1 })
  assert.equal(r.amount, 31.1034768)
})

test("EUR→XAU (g): label starts with '1 EUR = ', not '1 XAU'", () => {
  const r = computeConversion({
    base: "EUR", quote: "XAU", metalUnit: "g", amount: 100,
    fx: USD_EUR, metals: { XAU },
  })
  assert.ok(r.rateLabel.startsWith("1 EUR = "), r.rateLabel)
  assert.ok(!r.rateLabel.startsWith("1 XAU"), r.rateLabel)
  assert.ok(r.rateLabel.endsWith(" g Gold"), r.rateLabel)
  const eurPerGram = (4166.100098 * 0.88) / 31.1034768
  assert.ok(Math.abs(r.rate! - 1 / eurPerGram) < 1e-12)
  assert.equal(r.status, "ready")
  console.log("   ", r.rateLabel)
})

test("XAU→EUR (g): label '1 g Gold = …'", () => {
  const r = computeConversion({ base: "XAU", quote: "EUR", metalUnit: "g", amount: 1, fx: USD_EUR, metals: { XAU } })
  assert.ok(r.rateLabel.startsWith("1 g Gold = "), r.rateLabel)
  assert.ok(r.rateLabel.endsWith(" EUR"), r.rateLabel)
  assert.equal(r.fxDate, "2026-10-16")
  assert.equal(r.metalPriceTime, "2026-10-17T11:59:11.000Z")
  console.log("   ", r.rateLabel)
})

test("XAU→XAG: rate = XAU_usd / XAG_usd, labels correct on both sides", () => {
  const r = computeConversion({ base: "XAU", quote: "XAG", metalUnit: "oz", amount: 1, metals: { XAU, XAG } })
  assert.equal(r.rate, 4166.100098 / 52.3)
  assert.ok(r.rateLabel.startsWith("1 oz Gold = "), r.rateLabel)
  assert.ok(r.rateLabel.endsWith(" oz Silver"), r.rateLabel)
  assert.ok(r.inverseRateLabel.startsWith("1 oz Silver = "), r.inverseRateLabel)
  assert.ok(r.inverseRateLabel.endsWith(" oz Gold"), r.inverseRateLabel)
  console.log("   ", r.rateLabel, "|", r.inverseRateLabel)
})

test("A→B and B→A rates multiply to 1 (tolerance 1e-9)", () => {
  const eurUsd: FxQuote = { base: "EUR", quote: "USD", rate: 1 / 0.88, date: "2026-10-16" }
  const cases: [ReturnType<typeof computeConversion>, ReturnType<typeof computeConversion>][] = [
    [
      computeConversion({ base: "USD", quote: "EUR", fx: USD_EUR }),
      computeConversion({ base: "EUR", quote: "USD", fx: eurUsd }),
    ],
    [
      computeConversion({ base: "TRY", quote: "XAU", fx: USD_TRY, metals: { XAU } }),
      computeConversion({ base: "XAU", quote: "TRY", fx: USD_TRY, metals: { XAU } }),
    ],
    [
      computeConversion({ base: "XAU", quote: "XAG", metals: { XAU, XAG } }),
      computeConversion({ base: "XAG", quote: "XAU", metals: { XAU, XAG } }),
    ],
  ]
  for (const [ab, ba] of cases) {
    assert.ok(Math.abs(ab.rate! * ba.rate! - 1) < 1e-9, `${ab.base}/${ab.quote}`)
    assert.ok(Math.abs(ab.rate! * ab.inverseRate! - 1) < 1e-9)
  }
})

test("FX present, metal missing → status 'partial', missing ['metal'], no silent —", () => {
  const r = computeConversion({ base: "EUR", quote: "XAU", amount: 1, fx: USD_EUR, metals: {} })
  assert.equal(r.status, "partial")
  assert.deepEqual(r.missing, ["metal"])
  assert.equal(r.rate, null)
})

test("metal pages: stale metal source surfaces as 'stale'", () => {
  const r = computeConversion({ base: "XAU", quote: "USD", metals: { XAU: { ...XAU, stale: true } } })
  assert.equal(r.status, "stale")
})
