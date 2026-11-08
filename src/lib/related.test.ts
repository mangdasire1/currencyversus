// Related links and the method page link (Phase 8, task 5).
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { metalRelatedLinks, ratioRelatedLinks, pairRelatedLinks, METHOD_LINK } from "./related.ts"
import type { RelatedLink } from "./related.ts"
import { MEASUREMENT_COHORT, CONTROL_PAGES, REVERSE_PAIRS, isReversePair } from "./pilot.ts"
import { routeCatalog, parsePairSlug, METAL_PAGE_CURRENCIES, METAL_SLUGS } from "./routes.ts"

const CATALOG = new Set(routeCatalog())
const MEASURED = new Set([...MEASUREMENT_COHORT, ...CONTROL_PAGES])

function pages(): Array<{ page: string; links: RelatedLink[] }> {
  const out: Array<{ page: string; links: RelatedLink[] }> = []
  for (const metal of Object.keys(METAL_PAGE_CURRENCIES)) {
    for (const c of METAL_PAGE_CURRENCIES[metal]) out.push({ page: `${METAL_SLUGS[metal]}-vs-${c.toLowerCase()}`, links: metalRelatedLinks(metal, c) })
  }
  out.push({ page: "gold-vs-silver", links: ratioRelatedLinks() })
  for (const slug of REVERSE_PAIRS) {
    const { base, target } = parsePairSlug(slug)!
    out.push({ page: slug, links: pairRelatedLinks(base, target) })
  }
  return out
}

test("related links: real pages, descriptive text, the method page, never a measured page or the page itself", () => {
  const all = pages()
  assert.equal(all.length, 38 + 1 + 8) // metal pages + gold/silver ratio + reverse pairs
  let n = 0
  for (const { page, links } of all) {
    assert.ok(links.length >= 3, page)
    assert.deepEqual(links.at(-1), METHOD_LINK, `${page}: method link`)
    for (const l of links) {
      n++
      assert.match(l.href, /^\/[a-z-]+\/$/, l.href)
      const slug = l.href.slice(1, -1)
      assert.ok(slug === "method" || CATALOG.has(slug), `${page} → ${l.href} is not a generated page`)
      assert.notEqual(slug, page, `${page} links to itself`)
      assert.ok(!MEASURED.has(slug), `${page} → ${l.href} is a measured page`)
      assert.ok(l.text.length >= 15 && !/click here|read more/i.test(l.text), `${page}: "${l.text}"`)
    }
  }
  const sample = (p: string) => all.find((x) => x.page === p)!.links.map((l) => `${l.href} "${l.text}"`).join("\n      ")
  console.log(`    ${all.length} pages, ${n} links, 0 to measured pages (${[...MEASURED].join(", ")})`)
  console.log(`    try-vs-usd:\n      ${sample("try-vs-usd")}`)
  console.log(`    silver-vs-usd:\n      ${sample("silver-vs-usd")}`)
})

test("cohort pages get no related links and keep their footer", () => {
  for (const slug of MEASUREMENT_COHORT) assert.equal(isReversePair(slug), false, slug)
  for (const slug of REVERSE_PAIRS) assert.equal(isReversePair(slug), true, slug)
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "[pair]", "PilotPairPageClient.tsx"), "utf8")
  assert.match(src, /isReversePair\(pairSlug\(base, target\)\) && <RelatedLinks/)
  assert.match(src, /cohort pages: footer unchanged/)
})

test("platinum and palladium pages are linked from the gold and silver pages in the same currency", () => {
  const all = pages()
  for (const metal of ["XPT", "XPD"]) {
    for (const c of METAL_PAGE_CURRENCIES[metal]) {
      const target = `/${METAL_SLUGS[metal]}-vs-${c.toLowerCase()}/`
      const from = all.filter((p) => p.links.some((l) => l.href === target)).map((p) => p.page)
      assert.ok(from.includes(`gold-vs-${c.toLowerCase()}`) && from.includes(`silver-vs-${c.toLowerCase()}`), `${target} from ${from.join(", ")}`)
      assert.ok(from.length >= 6, `${target}: ${from.length} linking pages`)
    }
  }
  // gold/silver in a currency without platinum/palladium pages: no link to them
  assert.ok(!metalRelatedLinks("XAU", "JPY").some((l) => /platinum|palladium/.test(l.href)))
})
