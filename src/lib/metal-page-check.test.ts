import { test } from "node:test"
import assert from "node:assert/strict"
import { checkMetalPageHtml } from "./metal-page-check.ts"

// Shapes taken from a real build (React inserts <!-- --> between text parts).
const page = (headline: string, field: string, sentence: string) =>
  `<p>1 oz <!-- -->Platinum<!-- --> = <!-- -->${headline}</p>` +
  `<input id="a" type="text" inputMode="decimal" value="1"/><input id="b" type="text" inputMode="decimal" value="${field}"/>` +
  `<p class="text-[26px]">${sentence}</p><script>self.__next_f.push([1,"1 troy ounce of platinum = 1,544 USD"])</script>`

const OK = page("1,544 USD", "1,544", "1 troy ounce of platinum = 1,544 USD")
const EXPECT = { metalName: "Platinum", quote: "USD" }

test("metal page check: a page with the build-time price passes", () => {
  assert.deepEqual(checkMetalPageHtml(OK, EXPECT), { problems: [], price: "1,544" })
  const ratio = `<p>1 oz Gold = <span>78.20 oz Silver</span></p><input inputMode="decimal" value="1"/><input inputMode="decimal" value="78.203"/><p>1 troy ounce of gold = 78.203 troy ounces of silver</p>`
  assert.deepEqual(checkMetalPageHtml(ratio, { metalName: "Gold", quote: "Silver" }).problems, [])
})

test("metal page check: missing or zero price fails, even if the price is in a script payload", () => {
  // What the page renders when the build could not fetch the price
  const missing = `<p>Loading price…</p><input inputMode="decimal" value="1"/><input inputMode="decimal" value=""/><p>Loading price…</p>` +
    `<script>self.__next_f.push([1,"1 troy ounce of platinum = 1,544 USD"])</script>`
  const r = checkMetalPageHtml(missing, EXPECT)
  console.log(`    missing price → ${r.problems.length} problems: ${r.problems.join(" | ")}`)
  assert.equal(r.problems.length, 3)
  assert.equal(checkMetalPageHtml(page("0 USD", "0", "1 troy ounce of platinum = 0 USD"), EXPECT).problems.length, 3)
  assert.equal(checkMetalPageHtml(page("1,544 EUR", "1,544", "1 troy ounce of platinum = 1,544 EUR"), EXPECT).problems.length, 2) // wrong currency
})
