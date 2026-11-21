// Breadcrumb trails and their BreadcrumbList structured data (B2/B7).
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { pairCrumbs, metalCrumbs, ratioCrumbs, indexCrumbs, breadcrumbSchema, SITE } from "./breadcrumbs.ts"
import type { Crumb } from "./breadcrumbs.ts"
import { routeCatalog, parsePairSlug } from "./routes.ts"
import { METALS } from "./metals.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const CATALOG = new Set(routeCatalog())
const INDEX_PAGES = new Set(["/", "/currencies/", "/metals/"])
const isPage = (p: string) => INDEX_PAGES.has(p) || (p.startsWith("/") && p.endsWith("/") && CATALOG.has(p.slice(1, -1)))

function trailFor(slug: string): Crumb[] {
  const { base, target } = parsePairSlug(slug)!
  if (slug === "gold-vs-silver") return ratioCrumbs()
  if (METALS.some((m) => m.code === base)) return metalCrumbs(base, target)
  return pairCrumbs(base, target)
}

test("every generated pair, metal and index page has a trail of real pages ending at itself", () => {
  const all = [...routeCatalog().map((s) => ({ page: `/${s}/`, crumbs: trailFor(s) })), { page: "/currencies/", crumbs: indexCrumbs("currencies") }, { page: "/metals/", crumbs: indexCrumbs("metals") }]
  for (const { page, crumbs } of all) {
    assert.ok(crumbs.length >= 2, page) // Google: at least two ListItems
    assert.deepEqual(crumbs[0], { name: "Home", path: "/" })
    assert.equal(crumbs.at(-1)!.path, page, `${page}: the last step is the page itself`)
    for (const c of crumbs) assert.ok(isPage(c.path), `${page}: ${c.path} is not a generated page`)
  }
  console.log(`    ${all.length} trails, e.g. ${pairCrumbs("USD", "TRY").map((c) => c.name).join(" › ")} · ${metalCrumbs("XAU", "USD").map((c) => c.name).join(" › ")} · ${ratioCrumbs().map((c) => c.name).join(" › ")}`)
  assert.deepEqual(pairCrumbs("USD", "TRY").map((c) => c.name), ["Home", "Currencies", "USD to TRY"])
  assert.deepEqual(pairCrumbs("USD", "TRY")[1].path, "/currencies/") // a page, not /#currencies
  assert.deepEqual(metalCrumbs("XPT", "GBP").map((c) => c.path), ["/", "/metals/", "/platinum-vs-gbp/"])
})

test("BreadcrumbList: positions from 1, absolute URLs, names as shown", () => {
  const s = breadcrumbSchema(pairCrumbs("EUR", "JPY")) as { "@type": string; itemListElement: Array<{ position: number; name: string; item: string }> }
  assert.equal(s["@type"], "BreadcrumbList")
  assert.deepEqual(s.itemListElement, [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name: "Currencies", item: `${SITE}/currencies/` },
    { "@type": "ListItem", position: 3, name: "EUR to JPY", item: `${SITE}/eur-vs-jpy/` },
  ])
})

test("each page type renders the trail from the shared list (visible and structured data together)", () => {
  const uses: Array<[string, RegExp]> = [
    ["app/(en)/[pair]/PilotPairPageClient.tsx", /<Breadcrumbs crumbs=\{pairCrumbs\(base, target\)\} \/>/],
    ["app/(en)/[pair]/MetalPageClient.tsx", /<Breadcrumbs crumbs=\{metalCrumbs\(metal, target\)\} \/>/],
    ["app/(en)/[pair]/MetalRatioPageClient.tsx", /<Breadcrumbs crumbs=\{ratioCrumbs\(\)\} \/>/],
    ["app/(en)/metals/page.tsx", /<Breadcrumbs crumbs=\{indexCrumbs\("metals"\)\} \/>/],
    ["app/(en)/currencies/page.tsx", /<Breadcrumbs crumbs=\{indexCrumbs\("currencies"\)\} \/>/],
  ]
  for (const [file, re] of uses) assert.match(fs.readFileSync(path.join(SRC, file), "utf8"), re, file)
  const comp = fs.readFileSync(path.join(SRC, "components", "Breadcrumbs.tsx"), "utf8")
  assert.match(comp, /breadcrumbSchema\(crumbs\)/) // the structured data comes from the same list
  assert.match(comp, /aria-current="page"/)
  assert.match(comp, /<Link href=\{c\.path\} className="inline-flex items-center justify-center min-h-\[44px\] min-w-\[44px\]/) // "Home" is narrower than 44px on its own
})
