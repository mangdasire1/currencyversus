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

test("EUR makes no member-count claim (the Bulgaria error class: counts go stale)", () => {
  assert.doesNotMatch(CURRENCY_INFO.EUR.description, /\b\d+ of the \d+\b/)
  assert.match(CURRENCY_INFO.EUR.description, /shared by most European Union member states/)
})
