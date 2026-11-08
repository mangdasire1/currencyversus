import { test } from "node:test"
import assert from "node:assert/strict"
import {
  routeCatalog, isValidPairRoute, parsePairSlug, navigateSelection, navigateSwap,
  FULL_COVERAGE_METALS, METAL_PAGE_CURRENCIES,
} from "./routes.ts"
import { CURRENCIES } from "./currencies.ts"

// Codes a page-changing selector could offer. No such selector offers metals
// today (pair pages: currencies only; metal pages: no selector; the home
// converter does not navigate), so the scan keeps the metals with a page for
// every currency and checks platinum/palladium pages separately below.
const ALL_CODES = [...CURRENCIES.map((c) => c.code), ...FULL_COVERAGE_METALS] // 15 + 2
const CATALOG = routeCatalog()

test("catalog has 249 unique routes (210 currency + 30 gold/silver + 8 platinum/palladium + gold-vs-silver)", () => {
  assert.equal(CATALOG.length, 249)
  assert.equal(new Set(CATALOG).size, 249)
})

test("platinum and palladium: exactly USD, EUR, TRY, GBP; every page parses; no other currency", () => {
  const pages = CATALOG.filter((s) => /^(platinum|palladium)-vs-/.test(s))
  console.log(`    ${pages.length} pages: ${pages.join(" ")}`)
  assert.deepEqual(pages, [
    "platinum-vs-usd", "platinum-vs-eur", "platinum-vs-try", "platinum-vs-gbp",
    "palladium-vs-usd", "palladium-vs-eur", "palladium-vs-try", "palladium-vs-gbp",
  ])
  for (const slug of pages) {
    const p = parsePairSlug(slug)!
    assert.ok(p && ["XPT", "XPD"].includes(p.base) && METAL_PAGE_CURRENCIES[p.base].includes(p.target), slug)
    assert.equal(navigateSwap(p)!.path, `/${slug}/`) // only the metal-first page exists
  }
  assert.equal(isValidPairRoute("XPT", "JPY"), false)
  assert.equal(parsePairSlug("palladium-vs-chf"), null)
  // Selecting among the covered currencies stays on platinum pages
  assert.equal(navigateSelection({ base: "XPT", target: "USD" }, "target", "TRY")!.path, "/platinum-vs-try/")
  assert.deepEqual([...FULL_COVERAGE_METALS], ["XAU", "XAG"])
})

test("17×17 scan: every From/To selection from every page resolves to a catalog route", () => {
  let checked = 0
  const failures: string[] = []
  // Platinum/palladium pages have no selector, so they are not starting points
  for (const slug of CATALOG.filter((s) => { const p = parsePairSlug(s)!; return ALL_CODES.includes(p.base) && ALL_CODES.includes(p.target) })) {
    const current = parsePairSlug(slug)!
    for (const side of ["base", "target"] as const) {
      for (const code of ALL_CODES) {
        const nav = navigateSelection(current, side, code)
        checked++
        if (!nav || !isValidPairRoute(nav.base, nav.target)) failures.push(`${slug} ${side}=${code}`)
      }
    }
    const swap = navigateSwap(current)
    checked++
    if (!swap || !isValidPairRoute(swap.base, swap.target)) failures.push(`${slug} swap`)
  }
  // And the raw 17×17 grid of (From, To) pairs, with A→A handled as a swap from a page.
  let grid = 0
  for (const from of ALL_CODES) {
    for (const to of ALL_CODES) {
      grid++
      const startPage = from === to ? (from === "USD" ? { base: "EUR", target: "USD" } : { base: "USD", target: from }) : null
      const nav = startPage ? navigateSelection(startPage, "base", from) : (isValidPairRoute(from, to) || isValidPairRoute(to, from) ? { base: from, target: to } : null)
      if (!nav) failures.push(`grid ${from}→${to}`)
    }
  }
  console.log(`    navigations checked: ${checked} (241 pages × 2 sides × 17 codes + 241 swaps); 17×17 grid cells: ${grid}; failures: ${failures.length}`)
  assert.deepEqual(failures, [])
})

test("A→A on a detail page swaps the sides instead of producing /eur-vs-eur/", () => {
  const nav = navigateSelection({ base: "USD", target: "EUR" }, "base", "EUR")!
  assert.equal(nav.path, "/eur-vs-usd/")
  assert.equal(nav.swapped, true)
  const nav2 = navigateSelection({ base: "USD", target: "EUR" }, "target", "USD")!
  assert.equal(nav2.path, "/eur-vs-usd/")
  assert.equal(nav2.swapped, true)
  assert.equal(isValidPairRoute("EUR", "EUR"), false)
})

test("ordinary selections and swap are unchanged", () => {
  assert.equal(navigateSelection({ base: "USD", target: "EUR" }, "base", "GBP")!.path, "/gbp-vs-eur/")
  assert.equal(navigateSelection({ base: "USD", target: "EUR" }, "target", "TRY")!.path, "/usd-vs-try/")
  assert.equal(navigateSwap({ base: "USD", target: "EUR" })!.path, "/eur-vs-usd/")
  assert.equal(navigateSelection({ base: "USD", target: "EUR" }, "base", "GBP")!.swapped, false)
})

test("metal pages: only metal-first routes exist, selections are reordered onto them", () => {
  const nav = navigateSelection({ base: "USD", target: "EUR" }, "target", "XAU")!
  assert.equal(nav.path, "/gold-vs-usd/")
  assert.equal(nav.reordered, true)
  assert.equal(navigateSwap({ base: "XAU", target: "XAG" })!.path, "/gold-vs-silver/")
})
