import { test } from "node:test"
import assert from "node:assert/strict"
import { funFactCards, localContextText } from "./editorial-sections.ts"
import { CURRENCY_INFO } from "./currency-info.ts"
import { METAL_INFO } from "./metal-info.ts"

test("removed blocks are gone from the content", () => {
  for (const code of ["CAD", "KRW", "SGD"]) assert.equal(CURRENCY_INFO[code].funFact, undefined, `${code}.funFact`)
  assert.equal(METAL_INFO.XAU.localContext.MXN, undefined)
  assert.equal(METAL_INFO.XAG.localContext.CHF, undefined)
  assert.equal(METAL_INFO.XAG.localContext.BRL, undefined)
})

test("no fun fact on either side → no 'Did You Know?' section at all", () => {
  assert.deepEqual(funFactCards([CURRENCY_INFO.CAD, CURRENCY_INFO.KRW]), [])
  assert.deepEqual(funFactCards([CURRENCY_INFO.SGD, CURRENCY_INFO.CAD]), [])
})

test("fun fact on one side → only that card, never an empty card for the other", () => {
  const cards = funFactCards([CURRENCY_INFO.CAD, CURRENCY_INFO.USD])
  assert.deepEqual(cards.map((c) => c.code), ["USD"])
  assert.ok(cards[0].text.length > 0)
  assert.equal(funFactCards([CURRENCY_INFO.EUR, CURRENCY_INFO.USD]).length, 2)
})

test("blank or whitespace-only text counts as absent", () => {
  assert.deepEqual(funFactCards([{ code: "X", funFact: "   " }, undefined]), [])
  assert.equal(localContextText({ localContext: { USD: "  " } }, "USD"), null)
})

test("metal page: no local context for the currency → null (section and heading not rendered)", () => {
  assert.equal(localContextText(METAL_INFO.XAU, "MXN"), null)
  assert.equal(localContextText(METAL_INFO.XAG, "CHF"), null)
  assert.equal(localContextText(METAL_INFO.XAG, "BRL"), null)
  assert.ok(localContextText(METAL_INFO.XAU, "TRY"))
  assert.ok(localContextText(METAL_INFO.XAG, "MXN"))
})

test("every currency still has its description, economy and factors", () => {
  for (const [code, c] of Object.entries(CURRENCY_INFO)) {
    assert.ok(c.description && c.economy && c.factors.length === 4, code)
  }
})
