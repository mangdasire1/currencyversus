import { test } from "node:test"
import assert from "node:assert/strict"
import { MEASUREMENT_COHORT, NEW_LAYOUT_PAIRS, B1_SLICE_1, hasNewLayout, isValidPilotSlug } from "./pilot.ts"
import { routeCatalog, parsePairSlug, pairSlug } from "./routes.ts"

// The 2026-11-20 read-out is computed over exactly these pages.
const COHORT_20_NOV = [
  "eur-vs-chf", "aud-vs-usd", "eur-vs-gbp", "usd-vs-eur",
  "usd-vs-try", "usd-vs-jpy", "gbp-vs-usd", "usd-vs-cad",
]

test("measurement cohort: exactly the 8 slugs of the 20 November read-out", () => {
  assert.deepEqual([...MEASUREMENT_COHORT].sort(), [...COHORT_20_NOV].sort())
  assert.equal(new Set(MEASUREMENT_COHORT).size, 8)
  console.log(`    MEASUREMENT_COHORT (${MEASUREMENT_COHORT.length}): ${MEASUREMENT_COHORT.join(", ")}`)
})

test("new layout: all 210 currency pairs — including the cohort, the reverse directions and the B1 first slice", () => {
  assert.equal(NEW_LAYOUT_PAIRS.length, 210)
  assert.equal(new Set(NEW_LAYOUT_PAIRS).size, 210)
  for (const slug of B1_SLICE_1) assert.ok(NEW_LAYOUT_PAIRS.includes(slug), `slice page ${slug} missing`)
  for (const slug of MEASUREMENT_COHORT) assert.ok(NEW_LAYOUT_PAIRS.includes(slug), `cohort page ${slug} missing`)
  const catalog = new Set(routeCatalog())
  for (const slug of NEW_LAYOUT_PAIRS) {
    assert.ok(catalog.has(slug), `${slug} is not a generated page`)
    assert.ok(isValidPilotSlug(slug), `${slug} is not a fiat pair`)
    assert.ok(hasNewLayout(slug))
  }
  for (const slug of NEW_LAYOUT_PAIRS) {
    const { base, target } = parsePairSlug(slug)!
    assert.ok(NEW_LAYOUT_PAIRS.includes(pairSlug(target, base)), `reverse of ${slug} missing`) // a swap never changes layout
  }
  assert.equal(isValidPilotSlug("gold-vs-usd"), false)
  assert.equal(isValidPilotSlug("gold-vs-silver"), false)
  const old = routeCatalog().filter((s) => !hasNewLayout(s))
  assert.equal(old.length, 249 - 210) // left on the old page types: 38 metal pages + gold-vs-silver
  assert.ok(old.every((s) => !isValidPilotSlug(s)), "every currency pair is in the new layout")
  console.log(`    NEW_LAYOUT_PAIRS (${NEW_LAYOUT_PAIRS.length}); not in it: ${old.length} metal pages`)
})

test("B1 first slice: the 20 pages the site owner chose, each with its reverse, none already in the new layout", () => {
  const CHOSEN = [
    "sgd-vs-cad", "cad-vs-sgd", "usd-vs-krw", "krw-vs-usd", "eur-vs-try", "try-vs-eur", "aud-vs-krw", "krw-vs-aud",
    "usd-vs-inr", "inr-vs-usd", "usd-vs-cny", "cny-vs-usd", "sgd-vs-aud", "aud-vs-sgd",
    "usd-vs-brl", "brl-vs-usd", "eur-vs-jpy", "jpy-vs-eur", "sek-vs-inr", "inr-vs-sek",
  ]
  assert.deepEqual([...B1_SLICE_1].sort(), [...CHOSEN].sort())
  assert.equal(new Set(B1_SLICE_1).size, 20)
  for (const slug of B1_SLICE_1) {
    const { base, target } = parsePairSlug(slug)!
    assert.ok(B1_SLICE_1.includes(pairSlug(target, base)), `reverse of ${slug} missing from the slice`)
  }
  // the old control pages move to the new layout in this slice; the cohort record is untouched
  for (const control of ["eur-vs-try", "sek-vs-inr"]) assert.ok(hasNewLayout(control))
  assert.equal(MEASUREMENT_COHORT.length, 8)
})
