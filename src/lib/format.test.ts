import { test } from "node:test"
import assert from "node:assert/strict"
import { formatRateValue, formatMoney, formatMetalAmount, formatPercentChange } from "./format.ts"

test("very small rate 0.0000726 keeps its significant digits", () => {
  console.log(`    formatRateValue(0.0000726)   = ${formatRateValue(0.0000726)}`)
  assert.equal(formatRateValue(0.0000726), "0.0000726")
})

test("very large rate 206334.4396 → 2 decimals with grouping", () => {
  console.log(`    formatRateValue(206334.4396) = ${formatRateValue(206334.4396)}`)
  assert.equal(formatRateValue(206334.4396), "206,334.44")
})

test("rate magnitude bands: ≥100 → 2, ≥1 → 4, ≥0.01 → 5, <0.01 → 6–8", () => {
  assert.equal(formatRateValue(150.123456), "150.12")
  assert.equal(formatRateValue(1.08461234), "1.0846")
  assert.equal(formatRateValue(0.881234567), "0.88123")
  assert.equal(formatRateValue(0.0072612345), "0.007261")
  assert.equal(formatRateValue(0.00000001234), "0.00000001")
})

test("exact zero and below-resolution values never render as 0.00", () => {
  assert.equal(formatRateValue(0), "0")
  assert.equal(formatRateValue(0.000000001), "<0.00000001")
  assert.equal(formatMetalAmount(0.0000001, "g"), "<0.000001")
  assert.notEqual(formatRateValue(0.000000001), "0.00000000")
})

test("USD/EUR 3-month row: Then and Now distinguishable at rate precision", () => {
  const then = 0.88123, now = 0.88105
  assert.notEqual(formatRateValue(then), formatRateValue(now))
})

test("money uses the currency's own decimals", () => {
  assert.equal(formatMoney(1234.567, 2), "1,234.57")
  assert.equal(formatMoney(1234.567, 0), "1,235")
})

test("metal amounts: 1 USD ≈ 0.00726 g is not shown as 0.01 g", () => {
  console.log(`    formatMetalAmount(0.00726, "g") = ${formatMetalAmount(0.00726, "g")}`)
  assert.equal(formatMetalAmount(0.00726, "g"), "0.00726")
  assert.equal(formatMetalAmount(12.3456789, "g"), "12.346")
  assert.equal(formatMetalAmount(0.5, "g"), "0.5000")
  assert.equal(formatMetalAmount(2.5, "oz"), "2.5000")
  assert.equal(formatMetalAmount(0.000233, "oz"), "0.000233")
})

test("percent threshold: |p| < 0.01 → ~0%, boundary 0.01 shown", () => {
  assert.equal(formatPercentChange(-0.0099), "~0%")
  assert.equal(formatPercentChange(0.0099), "~0%")
  assert.equal(formatPercentChange(0), "~0%")
  assert.equal(formatPercentChange(0.01), "+0.01%")
  assert.equal(formatPercentChange(-0.02), "-0.02%")
  assert.equal(formatPercentChange(212.346), "+212.35%")
})
