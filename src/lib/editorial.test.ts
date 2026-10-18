import { test } from "node:test"
import assert from "node:assert/strict"
import { EDITORIAL_REVIEWED, editorialReviewDate, editorialReviewLabel } from "./editorial.ts"
import { CURRENCY_INFO } from "./currency-info.ts"

test("every currency with editorial content has a review entry", () => {
  for (const code of Object.keys(CURRENCY_INFO)) assert.ok(code in EDITORIAL_REVIEWED, code)
  for (const code of ["XAU", "XAG", "GOLD_SILVER_RATIO"]) assert.ok(code in EDITORIAL_REVIEWED, code)
})

test("unreviewed records never show a review date", () => {
  assert.equal(editorialReviewDate(["USD", "EUR"]), null)
  assert.match(editorialReviewLabel(["USD", "EUR"]), /review pending/)
})

test("eurozone membership count is 21 of 27 (Bulgaria joined 2026-01-01)", () => {
  const m = CURRENCY_INFO.EUR.description.match(/used by (\d+) of the 27 European Union member states/)
  assert.ok(m, "eurozone sentence present")
  assert.equal(m![1], "21")
})
