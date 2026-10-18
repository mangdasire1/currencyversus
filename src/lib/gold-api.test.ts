import { test } from "node:test"
import assert from "node:assert/strict"
import { parseGoldApiPrice } from "./gold-api.ts"

test("reads updatedAt from the live response shape", () => {
  const r = parseGoldApiPrice({
    currency: "USD", price: 4166.100098, symbol: "XAU",
    updatedAt: "2026-10-17T11:59:11Z", updatedAtReadable: "a few seconds ago",
  })
  assert.deepEqual(r, { price: 4166.100098, priceTime: "2026-10-17T11:59:11.000Z" })
})

test("missing or invalid updatedAt → priceTime null, never today's date", () => {
  assert.equal(parseGoldApiPrice({ price: 50 })!.priceTime, null)
  assert.equal(parseGoldApiPrice({ price: 50, updatedAt: "not a date" })!.priceTime, null)
  assert.equal(parseGoldApiPrice({ price: 50, timestamp: 1760702351 })!.priceTime, null)
})

test("missing price → null", () => {
  assert.equal(parseGoldApiPrice({ updatedAt: "2026-10-17T11:59:11Z" }), null)
  assert.equal(parseGoldApiPrice(null), null)
})
