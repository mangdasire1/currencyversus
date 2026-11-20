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

test("new layout: 36 unique existing fiat pages — the cohort, each reverse direction, the B1 first slice", () => {
  assert.equal(NEW_LAYOUT_PAIRS.length, 36)
  assert.equal(new Set(NEW_LAYOUT_PAIRS).size, 36)
  for (const slug of MEASUREMENT_COHORT) assert.ok(NEW_LAYOUT_PAIRS.includes(slug), `cohort page ${slug} missing`)
  const catalog = new Set(routeCatalog())
  for (const slug of NEW_LAYOUT_PAIRS) {
    assert.ok(catalog.has(slug), `${slug} is not a generated page`)
    assert.ok(isValidPilotSlug(slug), `${slug} is not a fiat pair`)
    assert.ok(hasNewLayout(slug))
  }
  const reverses = NEW_LAYOUT_PAIRS.filter((s) => !MEASUREMENT_COHORT.includes(s) && !B1_SLICE_1.includes(s))
  for (const slug of MEASUREMENT_COHORT) {
    const { base, target } = parsePairSlug(slug)!
    assert.ok(reverses.includes(pairSlug(target, base)), `reverse of ${slug} missing`)
  }
  assert.equal(isValidPilotSlug("gold-vs-usd"), false)
  assert.equal(isValidPilotSlug("gold-vs-silver"), false)
  const old = routeCatalog().filter((s) => !hasNewLayout(s))
  assert.equal(old.length, 249 - 36) // 210 currency + 38 metal + gold-vs-silver, minus the new layout
  console.log(`    NEW_LAYOUT_PAIRS (${NEW_LAYOUT_PAIRS.length}): cohort + ${reverses.join(", ")} + B1 slice 1 (${B1_SLICE_1.length}); old layout: ${old.length} pages`)
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
    assert.equal(NEW_LAYOUT_PAIRS.filter((s) => s === slug).length, 1, `${slug} listed twice`)
  }
  // the old control pages move to the new layout in this slice; the cohort record is untouched
  for (const control of ["eur-vs-try", "sek-vs-inr"]) assert.ok(hasNewLayout(control))
  assert.equal(MEASUREMENT_COHORT.length, 8)
})
