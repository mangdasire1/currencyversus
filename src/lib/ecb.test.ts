// Inverse-rate consistency and displayed precision (Phase 8, task 2).
import { test } from "node:test"
import assert from "node:assert/strict"
import { ECB_DECIMALS, ECB_SIGNIFICANT, pairSignificantDigits, crossRate, crossSeries } from "./ecb.ts"
import { computeConversion } from "./conversion.ts"
import { formatFxRate } from "./format.ts"
import { getFAQItems } from "./structured-data.ts"
import { CURRENCIES } from "./currencies.ts"

const CODES = CURRENCIES.map((c) => c.code)
const PAIRS = CODES.flatMap((b) => CODES.filter((t) => t !== b).map((t) => [b, t] as const)) // 210

// Recorded ECB euro reference rates (api.frankfurter.dev/v1/<date>, no base=).
// 2026-10-23 is the data moment of the 24 October review.
const ECB_2026_10_23: Record<string, number> = {
  AUD: 1.5939, BRL: 5.6485, CAD: 1.5665, CHF: 0.9227, CNY: 7.466, GBP: 0.83728, INR: 106.272,
  JPY: 175.51, KRW: 1482.46, MXN: 21.0226, SEK: 11.131, SGD: 1.431, TRY: 55.6715, USD: 1.1193,
}
// eurofxref-daily.xml of 2026-10-28, as published (trailing zeros kept).
const ECB_2026_10_28_XML: Record<string, string> = {
  USD: "1.1133", JPY: "175.86", GBP: "0.83785", CHF: "0.9247", TRY: "55.4846", AUD: "1.5830", BRL: "5.9307",
  CAD: "1.5638", CNY: "7.4217", INR: "106.0095", KRW: "1492.35", MXN: "20.7416", SGD: "1.4274", SEK: "11.0560",
}
const ECB_2026_10_28 = Object.fromEntries(Object.entries(ECB_2026_10_28_XML).map(([k, v]) => [k, Number(v)]))

// Provider stub: answers like api.frankfurter.dev for euro requests and
// records every URL, so the tests can check what the chain asks for.
const urls: string[] = []
globalThis.fetch = (async (input: string | URL) => {
  const url = new URL(String(input))
  urls.push(url.pathname + url.search)
  const symbols = (url.searchParams.get("symbols") ?? "").split(",").filter(Boolean)
  const pick = (all: Record<string, number>) => Object.fromEntries(symbols.map((s) => [s, all[s]]))
  if (url.searchParams.has("base")) return new Response(JSON.stringify({ base: url.searchParams.get("base"), date: "2026-10-23", rates: {} }))
  if (url.pathname.includes("..")) {
    return new Response(JSON.stringify({ base: "EUR", start_date: "2026-10-23", end_date: "2026-10-28", rates: { "2026-10-23": pick(ECB_2026_10_23), "2026-10-28": pick(ECB_2026_10_28) } }))
  }
  return new Response(JSON.stringify({ base: "EUR", date: "2026-10-23", rates: pick(ECB_2026_10_23) }))
}) as typeof fetch
const { fetchLatestRates, fetchTimeSeries, fetchRateOn } = await import("./api.ts")

function page(base: string, target: string, rate: number) {
  return computeConversion({ base, quote: target, fx: { base, quote: target, rate, date: "2026-10-23" } })
}

test("A→B and B→A pages: the same data moment gives exact inverses and the same two labels", async () => {
  const usdTry = await fetchLatestRates("USD", ["TRY"])
  const tryUsd = await fetchLatestRates("TRY", ["USD"])
  const a = page("USD", "TRY", usdTry.rates.TRY)
  const b = page("TRY", "USD", tryUsd.rates.USD)
  console.log(`    USD/TRY page: ${a.rateLabel} · ${a.inverseRateLabel}`)
  console.log(`    TRY/USD page: ${b.rateLabel} · ${b.inverseRateLabel}`)
  assert.ok(Math.abs(a.rate! * b.rate! - 1) < 1e-12)
  assert.equal(a.rateLabel, b.inverseRateLabel)
  assert.equal(a.inverseRateLabel, b.rateLabel)
  assert.equal(a.rateLabel, "1 USD = 49.738 TRY")
  assert.equal(b.rateLabel, "1 TRY = 0.02011 USD") // 5 decimals below 1 (unchanged rule), 4 significant digits

  // All 210 pages, both data moments
  let checked = 0
  for (const day of [ECB_2026_10_23, ECB_2026_10_28]) {
    for (const [base, target] of PAIRS) {
      const ab = page(base, target, crossRate(day, base, target)!)
      const ba = page(target, base, crossRate(day, target, base)!)
      assert.ok(Math.abs(ab.rate! * ba.rate! - 1) < 1e-12, `${base}/${target}`)
      assert.equal(ab.inverseRateLabel, ba.rateLabel, `${base}/${target}`)
      checked++
    }
  }
  console.log(`    pair pages checked (2 data moments): ${checked}, label mismatches: 0`)
})

test("chain: the inverse comes from the raw euro rates, never from a rounded rate", async () => {
  urls.length = 0
  const tryUsd = await fetchLatestRates("TRY", ["USD"])
  const series = await fetchTimeSeries("2026-10-23", "2026-10-28", "TRY", ["USD"])
  const on = await fetchRateOn("2026-10-24", "TRY", "USD")
  console.log(`    requests: ${urls.join("  ")}`)
  for (const u of urls) {
    assert.doesNotMatch(u, /[?&]base=/, "no per-base (already rounded) provider cross")
    assert.match(u, /symbols=(TRY%2CUSD|USD%2CTRY|TRY,USD|USD,TRY)/)
  }
  // Raw quotient of the two euro legs, at full float precision
  const raw = 1.1193 / 55.6715
  assert.equal(tryUsd.rates.USD, raw)
  assert.equal(series.rates["2026-10-23"].USD, raw)
  assert.equal(on.rate, raw)
  const b = page("TRY", "USD", tryUsd.rates.USD)
  assert.equal(b.inverseRate, 1 / raw)
  // The rounded values that produced the reported numbers are not in the chain
  assert.notEqual(b.inverseRate!.toFixed(4), (1 / 0.020105).toFixed(4)) // 49.7389: provider's rounded TRY→USD
  assert.notEqual(b.inverseRate!.toFixed(4), (1 / 0.02011).toFixed(4)) // 49.7265: inverse of the displayed 0.02011
  console.log(`    TRY→USD raw ${raw} → inverse ${b.inverseRate} (not 1/0.020105 = ${(1 / 0.020105).toFixed(4)}, not 1/0.02011 = ${(1 / 0.02011).toFixed(4)})`)
  // Series: every day of A→B times B→A is 1
  const ab = crossSeries({ d1: ECB_2026_10_23, d2: ECB_2026_10_28 }, "USD", CODES)
  const ba = crossSeries({ d1: ECB_2026_10_23, d2: ECB_2026_10_28 }, "TRY", CODES)
  assert.ok(Math.abs(ab.d1.TRY * ba.d1.USD - 1) < 1e-12 && Math.abs(ab.d2.TRY * ba.d2.USD - 1) < 1e-12)
})

// Significant digits in a displayed number ("49.738" → 5, "0.020105" → 5, "1,492.4" → 5).
function significantDigits(text: string): number {
  const digits = text.replace(/[^0-9.]/g, "").replace(".", "").replace(/^0+/, "")
  return digits.length
}

test("displayed rates never carry more significant digits than the ECB data", () => {
  // The precision table is the published one: decimals + integer digits
  for (const [code, text] of Object.entries(ECB_2026_10_28_XML)) {
    const decimals = text.split(".")[1]?.length ?? 0
    assert.equal(decimals, ECB_DECIMALS[code], `${code} decimals`)
    assert.equal(significantDigits(text), ECB_SIGNIFICANT[code], `${code} significant digits`)
  }
  assert.equal(pairSignificantDigits("EUR", "CHF"), 4)
  assert.equal(pairSignificantDigits("USD", "TRY"), 5)
  assert.equal(pairSignificantDigits("EUR", "INR"), 7)

  let over = 0
  let checked = 0
  for (const [base, target] of PAIRS) {
    const sig = pairSignificantDigits(base, target)
    const c = page(base, target, crossRate(ECB_2026_10_28, base, target)!)
    for (const label of [c.rateLabel, c.inverseRateLabel]) {
      const num = label.split(" = ")[1].split(" ")[0]
      checked++
      if (significantDigits(num) > sig) over++
    }
    const faq = getFAQItems(base, target, c.rate, "2026-10-28")[0].answer.match(/equals ([0-9.,]+)/)![1]
    if (significantDigits(faq) > sig) over++
    checked++
  }
  console.log(`    labels + FAQ figures checked: ${checked}, over the ECB precision: ${over}`)
  assert.equal(over, 0)

  const show = (b: string, t: string) => page(b, t, crossRate(ECB_2026_10_28, b, t)!).rateLabel
  console.log(`    ${show("USD", "TRY")} | ${show("EUR", "CHF")} | ${show("CHF", "EUR")} | ${show("USD", "KRW")} | ${show("JPY", "USD")}`)
  assert.equal(formatFxRate(49.737782, 5), "49.738") // was 49.7380
  assert.equal(formatFxRate(0.9247, 4), "0.9247") // was 0.92470
  assert.equal(formatFxRate(1 / 0.9247, 4), "1.081") // was 1.0814
  assert.equal(formatFxRate(1.1133, 5), "1.1133") // unchanged
  assert.equal(formatFxRate(0.0063306, 5), "0.006331") // fewer digits than the source is allowed
})
