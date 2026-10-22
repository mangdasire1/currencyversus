import { test } from "node:test"
import assert from "node:assert/strict"
import { PILOT_PAIRS, isPilot, isValidPilotSlug } from "./pilot.ts"
import { routeCatalog } from "./routes.ts"

test("pilot: 8 unique slugs, all existing fiat pair pages (no metal pages)", () => {
  assert.equal(PILOT_PAIRS.length, 8)
  assert.equal(new Set(PILOT_PAIRS).size, 8)
  for (const slug of PILOT_PAIRS) assert.ok(isValidPilotSlug(slug), slug)
  assert.equal(isValidPilotSlug("gold-vs-usd"), false)
  assert.equal(isValidPilotSlug("gold-vs-silver"), false)
})

test("pilot: the two fixed pairs are in, everything else is the control group", () => {
  assert.ok(isPilot("eur-vs-chf"))
  assert.ok(isPilot("usd-vs-try"))
  assert.equal(isPilot("chf-vs-eur"), false) // direction matters
  assert.equal(isPilot("eur-vs-jpy"), false)
  const control = routeCatalog().filter((s) => !isPilot(s))
  assert.equal(control.length, 241 - 8)
  console.log(`    pilot ${PILOT_PAIRS.length}: ${PILOT_PAIRS.join(", ")}; control group: ${control.length} pages`)
})
