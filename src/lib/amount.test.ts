import { test } from "node:test"
import assert from "node:assert/strict"
import { parseAmount, amountErrorMessage, MAX_AMOUNT } from "./amount.ts"

test("-1 → rejected as negative with a visible message", () => {
  assert.deepEqual(parseAmount("-1"), { ok: false, reason: "negative" })
  assert.equal(amountErrorMessage("negative"), "Enter a positive amount.")
})

test("empty string → neutral 'empty', not silently 0", () => {
  assert.deepEqual(parseAmount(""), { ok: false, reason: "empty" })
  assert.deepEqual(parseAmount("   "), { ok: false, reason: "empty" })
  assert.equal(amountErrorMessage("empty"), null)
})

test("'abc' → invalid", () => {
  assert.deepEqual(parseAmount("abc"), { ok: false, reason: "invalid" })
  assert.deepEqual(parseAmount("1.2.3"), { ok: false, reason: "invalid" })
  assert.deepEqual(parseAmount("Infinity"), { ok: false, reason: "invalid" })
  assert.deepEqual(parseAmount("NaN"), { ok: false, reason: "invalid" })
})

test("1e20 → too large; 1e400 (non-finite) → too large", () => {
  assert.deepEqual(parseAmount("1e20"), { ok: false, reason: "too-large" })
  assert.deepEqual(parseAmount("1e400"), { ok: false, reason: "too-large" })
  assert.deepEqual(parseAmount(String(MAX_AMOUNT)), { ok: true, value: MAX_AMOUNT })
})

test("0 → valid zero (and -0 normalised)", () => {
  assert.deepEqual(parseAmount("0"), { ok: true, value: 0 })
  assert.ok(Object.is((parseAmount("-0") as { value: number }).value, 0))
})

test("very long decimal parses without error", () => {
  const r = parseAmount("0.123456789012345678901234567890")
  assert.equal(r.ok, true)
  assert.ok(Math.abs((r as { value: number }).value - 0.12345678901234568) < 1e-15)
})

test("exponent and separators", () => {
  assert.deepEqual(parseAmount("1e5"), { ok: true, value: 100000 })
  assert.deepEqual(parseAmount("1,000.50"), { ok: true, value: 1000.5 })
  assert.deepEqual(parseAmount(".5"), { ok: true, value: 0.5 })
  assert.deepEqual(parseAmount("1,5"), { ok: false, reason: "comma" })
})
