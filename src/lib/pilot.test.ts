import { test } from "node:test"
import assert from "node:assert/strict"
import { MEASUREMENT_COHORT, NEW_LAYOUT_PAIRS, hasNewLayout, isValidPilotSlug } from "./pilot.ts"
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

test("new layout: 16 unique existing fiat pages, the whole cohort plus each reverse direction", () => {
  assert.equal(NEW_LAYOUT_PAIRS.length, 16)
  assert.equal(new Set(NEW_LAYOUT_PAIRS).size, 16)
  for (const slug of MEASUREMENT_COHORT) assert.ok(NEW_LAYOUT_PAIRS.includes(slug), `cohort page ${slug} missing`)
  const catalog = new Set(routeCatalog())
  for (const slug of NEW_LAYOUT_PAIRS) {
    assert.ok(catalog.has(slug), `${slug} is not a generated page`)
    assert.ok(isValidPilotSlug(slug), `${slug} is not a fiat pair`)
    assert.ok(hasNewLayout(slug))
  }
  const reverses = NEW_LAYOUT_PAIRS.filter((s) => !MEASUREMENT_COHORT.includes(s))
  for (const slug of MEASUREMENT_COHORT) {
    const { base, target } = parsePairSlug(slug)!
    assert.ok(reverses.includes(pairSlug(target, base)), `reverse of ${slug} missing`)
  }
  assert.equal(isValidPilotSlug("gold-vs-usd"), false)
  assert.equal(isValidPilotSlug("gold-vs-silver"), false)
  const old = routeCatalog().filter((s) => !hasNewLayout(s))
  assert.equal(old.length, 249 - 16) // 210 currency + 38 metal + gold-vs-silver, minus the new layout
  console.log(`    NEW_LAYOUT_PAIRS (${NEW_LAYOUT_PAIRS.length}): cohort + ${reverses.join(", ")}; old layout: ${old.length} pages`)
})
