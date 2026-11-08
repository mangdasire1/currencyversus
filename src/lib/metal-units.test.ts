// Weight units and the weight ⇄ money converter (Phase 8, task 4).
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  GRAMS_PER_TROY_OUNCE, GRAMS_PER_AVOIRDUPOIS_OUNCE, WEIGHT_UNITS, DEFAULT_WEIGHT_UNIT,
  convertWeight, valueOfWeight, weightForValue, formatSignificant, solveConverter, METAL_SIGNIFICANT,
} from "./metal-units.ts"
import type { WeightUnit } from "./metal-units.ts"
import { OZ_TO_GRAM } from "./metals.ts"

test("constants: exact definitions, troy ounce is the default and the existing site constant", () => {
  assert.equal(GRAMS_PER_TROY_OUNCE, 31.1034768)
  assert.equal(GRAMS_PER_AVOIRDUPOIS_OUNCE, 28.349523125)
  assert.equal(OZ_TO_GRAM, GRAMS_PER_TROY_OUNCE) // the rest of the site's "oz" is the troy ounce
  assert.equal(DEFAULT_WEIGHT_UNIT, "ozt")
  assert.deepEqual(WEIGHT_UNITS.map((u) => u.key), ["ozt", "g", "kg", "oz"])
  console.log(`    1 ozt = ${GRAMS_PER_TROY_OUNCE} g, 1 oz (avoirdupois) = ${GRAMS_PER_AVOIRDUPOIS_OUNCE} g`)
})

test("round trip ozt → g → ozt (and through every unit)", () => {
  const units: WeightUnit[] = ["ozt", "g", "kg", "oz"]
  for (const v of [1, 0.5, 7.25, 1000, 1e-6, 123456.789]) {
    assert.ok(Math.abs(convertWeight(convertWeight(v, "ozt", "g"), "g", "ozt") - v) <= v * 1e-14, `${v}`)
    for (const a of units) for (const b of units) {
      assert.ok(Math.abs(convertWeight(convertWeight(v, a, b), b, a) - v) <= v * 1e-14, `${v} ${a}→${b}→${a}`)
    }
  }
  console.log(`    ozt→g→ozt for 1: ${convertWeight(convertWeight(1, "ozt", "g"), "g", "ozt")}`)
})

test("1 kg = 32.1507466 ozt; troy / avoirdupois ounce = 1.09714", () => {
  const kg = convertWeight(1, "kg", "ozt")
  const ratio = GRAMS_PER_TROY_OUNCE / GRAMS_PER_AVOIRDUPOIS_OUNCE
  console.log(`    1 kg = ${kg.toFixed(7)} ozt; ozt/oz = ${ratio.toFixed(5)} (difference ${((ratio - 1) * 100).toFixed(1)} %)`)
  assert.equal(kg.toFixed(7), "32.1507466")
  assert.equal(ratio.toFixed(5), "1.09714")
  assert.equal(convertWeight(1, "ozt", "oz").toFixed(5), "1.09714")
})

test("weight ⇄ money in both directions from the price per troy ounce", () => {
  const price = 53.808 // USD per troy ounce (gold-api XAG, 2026-10-28)
  assert.equal(valueOfWeight(1, "ozt", price), price)
  assert.ok(Math.abs(valueOfWeight(1, "g", price) - price / 31.1034768) < 1e-12)
  const w = weightForValue(500, "ozt", price) // "how much silver for $500"
  assert.ok(Math.abs(valueOfWeight(w, "ozt", price) - 500) < 1e-9)
  console.log(`    $500 of silver at ${price}/ozt = ${formatSignificant(w, 5)} ozt = ${formatSignificant(weightForValue(500, "g", price), 5)} g`)
})

test("zero, negative, empty and non-numeric input do not crash", () => {
  const p = 4043.8
  assert.deepEqual(solveConverter("0", "weight", "g", p), { weight: 0, value: 0, error: null })
  assert.deepEqual(solveConverter("0", "value", "kg", p), { weight: 0, value: 0, error: null })
  assert.deepEqual(solveConverter("", "weight", "ozt", p), { weight: null, value: null, error: null }) // neutral
  assert.equal(solveConverter("-1", "weight", "ozt", p).error, "Enter a positive amount.")
  assert.equal(solveConverter("abc", "value", "ozt", p).error, "Enter a number, e.g. 100 or 1.5")
  assert.equal(solveConverter("1,5", "weight", "g", p).error, "Use a dot (.) for decimals, e.g. 1.5")
  assert.equal(solveConverter("NaN", "weight", "g", p).error, "Enter a number, e.g. 100 or 1.5")
  assert.equal(solveConverter("1e400", "weight", "g", p).error, "Amount is too large (max 1,000,000,000,000,000).")
  // price missing or invalid: input accepted, no number invented
  for (const bad of [null, 0, -5, NaN]) assert.deepEqual(solveConverter("2", "weight", "g", bad), { weight: 2, value: null, error: null })
  assert.equal(formatSignificant(NaN, 5), "—")
  assert.equal(formatSignificant(0, 5), "0")
})

test("rounding by significant digits: 1 kg gold and 1 gram silver", () => {
  const gold = 4043.8, silver = 53.808
  const kgGold = valueOfWeight(1, "kg", gold)
  const gSilver = valueOfWeight(1, "g", silver)
  const lines = [
    `1 kg gold    = ${kgGold} → "${formatSignificant(kgGold, METAL_SIGNIFICANT.XAU)} USD"`,
    `1 ozt gold   = ${gold} → "${formatSignificant(gold, METAL_SIGNIFICANT.XAU)} USD"`,
    `1 g silver   = ${gSilver} → "${formatSignificant(gSilver, METAL_SIGNIFICANT.XAG)} USD"`,
    `1 g silver at 30 USD/ozt = ${30 / 31.1034768} → "${formatSignificant(30 / 31.1034768, METAL_SIGNIFICANT.XAG)} USD"`,
    `1 kg silver  = ${valueOfWeight(1, "kg", silver)} → "${formatSignificant(valueOfWeight(1, "kg", silver), METAL_SIGNIFICANT.XAG)} USD"`,
  ]
  for (const l of lines) console.log(`    ${l}`)
  assert.equal(formatSignificant(kgGold, 6), "130,011") // no cents at that size, thousands separator
  assert.equal(formatSignificant(gold, 6), "4,043.80")
  assert.equal(formatSignificant(gSilver, 5), "1.7300") // more than two decimals
  assert.equal(formatSignificant(30 / 31.1034768, 5), "0.96452")
  assert.equal(formatSignificant(1234567.89, 5), "1,234,568") // integer digits are never dropped
  assert.equal(formatSignificant(1e-12, 5), "<0.00000001")
})

test("metal pages: one weight converter, default rendered from props (no effect), troy note, 44px targets", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
  const read = (rel: string) => fs.readFileSync(path.join(src, rel), "utf8")
  const metalPage = read("app/[pair]/MetalPageClient.tsx")
  assert.equal((metalPage.match(/<MetalUnitConverter\b/g) ?? []).length, 1)
  assert.doesNotMatch(metalPage, /<CurrencyConverter\b/, "a single converter on metal pages")
  assert.equal((read("app/[pair]/MetalRatioPageClient.tsx").match(/<MetalUnitConverter\b/g) ?? []).length, 1)
  const c = read("components/MetalUnitConverter.tsx")
  assert.match(c, /useState\("1"\)/) // default amount in the first render (server HTML)
  assert.match(c, /useState<WeightUnit>\(DEFAULT_WEIGHT_UNIT\)/)
  assert.doesNotMatch(c, /useEffect\(\(\) => \{[^}]*set(Text|Unit|Side)\(/, "the default is never filled in after mount")
  assert.match(c, /Troy ounce \(\$\{GRAMS_PER_TROY_OUNCE\.toFixed\(4\)\} g\) — the standard unit for precious metals, not the \$\{GRAMS_PER_AVOIRDUPOIS_OUNCE\.toFixed\(2\)\} g ounce used for food\./)
  assert.equal(`${GRAMS_PER_TROY_OUNCE.toFixed(4)} / ${GRAMS_PER_AVOIRDUPOIS_OUNCE.toFixed(2)}`, "31.1035 / 28.35")
  assert.equal((c.match(/min-h-\[44px\]/g) ?? []).length, 2) // unit options and both inputs
})

test("platinum and palladium: same troy-ounce arithmetic, whole-dollar precision (4 significant digits)", () => {
  assert.equal(METAL_SIGNIFICANT.XPT, 4)
  assert.equal(METAL_SIGNIFICANT.XPD, 4)
  const rows: string[] = []
  for (const [code, price] of [["XPT", 1544], ["XPD", 1044]] as const) {
    const sig = METAL_SIGNIFICANT[code]
    const out = (["ozt", "g", "kg"] as const).map((u) => `1 ${u} = ${formatSignificant(valueOfWeight(1, u, price), sig)} USD`)
    rows.push(`${code} @ ${price}/ozt: ${out.join(" | ")}`)
  }
  for (const r of rows) console.log(`    ${r}`)
  assert.equal(formatSignificant(valueOfWeight(1, "ozt", 1544), 4), "1,544")
  assert.equal(formatSignificant(valueOfWeight(1, "g", 1544), 4), "49.64")
  assert.equal(formatSignificant(valueOfWeight(1, "kg", 1544), 4), "49,641") // integer digits are never dropped (Phase 8 rule)
  assert.equal(formatSignificant(valueOfWeight(1, "g", 1044), 4), "33.57")
})

test("platinum and palladium pages: the retail note is shown next to the converter", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const { METAL_INFO } = await import("./metal-info.ts")
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "[pair]", "MetalPageClient.tsx"), "utf8")
  assert.match(src, /\{info\.retailNote && <p/)
  for (const code of ["XPT", "XPD"] as const) assert.ok(METAL_INFO[code].retailNote && METAL_INFO[code].description, code)
  assert.match(METAL_INFO.XPD.retailNote!, /cannot expect to buy or sell palladium/)
  assert.equal(METAL_INFO.XAU.retailNote, undefined) // gold and silver pages unchanged
})

test("metal converter: the selected unit uses the darker fill (white text meets WCAG AA)", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "components", "MetalUnitConverter.tsx"), "utf8")
  assert.match(src, /background: checked \? PV\.selectedFill : PV\.raised/)
  assert.doesNotMatch(src, /PV\.accentFill/) // #6366F1 behind white text is 4.47:1
  assert.match(src, /color: checked \? "#FFFFFF"/)
})
