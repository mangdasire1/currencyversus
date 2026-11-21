// Post-build route check: every route a selector can navigate to must exist
// as a generated page in out/, and out/ must contain every catalog route.
// Exits non-zero (failing `npm run build`) on any mismatch.
//
//   node --experimental-strip-types scripts/verify-routes.mjs   (after `next build`)
//
// Plain JavaScript, but it imports the app's own route catalog and selector
// logic from src/lib/*.ts (single source, R-01). On Node 22.16 — Cloudflare's
// build runtime — loading .ts needs --experimental-strip-types; newer Node
// versions accept the flag as a no-op.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { routeCatalog, parsePairSlug, navigateSelection, navigateSwap, FULL_COVERAGE_METALS } from "../src/lib/routes.ts"
import { CURRENCIES } from "../src/lib/currencies.ts"
import { currenciesIndexTargets } from "../src/lib/currencies-index.ts"

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out")
if (!fs.existsSync(outDir)) {
  console.error("verify-routes: out/ not found — run `next build` first")
  process.exit(1)
}

const generated = new Set(
  fs.readdirSync(outDir).filter((d) => d.includes("-vs-") && fs.existsSync(path.join(outDir, d, "index.html")))
)

// Codes a page-changing selector could offer: the currencies and the metals
// with a page for every currency. Platinum and palladium (four currencies
// each) are not offered by any navigating selector and their pages have no
// selector, so they are not starting points; they are still required in out/
// through the catalog check below.
const codes = [...CURRENCIES.map((c) => c.code), ...FULL_COVERAGE_METALS]
const reachable = new Set()
for (const slug of routeCatalog()) {
  const current = parsePairSlug(slug) // every catalog slug parses
  if (!codes.includes(current.base) || !codes.includes(current.target)) continue
  for (const side of ["base", "target"]) {
    for (const code of codes) {
      const nav = navigateSelection(current, side, code)
      reachable.add(nav ? nav.path.slice(1, -1) : `UNRESOLVED:${slug}:${side}=${code}`)
    }
  }
  const swap = navigateSwap(current)
  reachable.add(swap ? swap.path.slice(1, -1) : `UNRESOLVED:${slug}:swap`)
}

const missing = [...reachable].filter((r) => !generated.has(r)).sort()
const unlisted = routeCatalog().filter((r) => !generated.has(r)).sort()

console.log(
  `verify-routes: ${generated.size} pair pages in out/, ${reachable.size} distinct selector destinations, ` +
    `${missing.length} unreachable destination(s), ${unlisted.length} catalog route(s) missing from out/`
)
if (missing.length) console.log("  selector destinations without a page:\n    " + missing.join("\n    "))
if (unlisted.length) console.log("  catalog routes not generated:\n    " + unlisted.join("\n    "))
// The /currencies/ index must link (plain <a href>, not only in scripts) to
// every currency pair page, and every link must be a generated page.
const indexFile = path.join(outDir, "currencies", "index.html")
const targets = currenciesIndexTargets()
let indexProblems = []
if (!fs.existsSync(indexFile)) indexProblems.push("index page missing from out/")
else {
  const html = fs.readFileSync(indexFile, "utf8").replace(/<script\b[\s\S]*?<\/script>/g, "")
  const hrefs = new Set([...html.matchAll(/<a\b[^>]*\bhref="([^"#]+)"/g)].map((m) => m[1]))
  const notLinked = targets.filter((t) => !hrefs.has(t))
  const pairLinks = [...hrefs].filter((h) => h.includes("-vs-"))
  const dead = pairLinks.filter((h) => !generated.has(h.slice(1, -1)))
  if (notLinked.length) indexProblems.push(`${notLinked.length} pair page(s) not linked: ${notLinked.slice(0, 5).join(", ")}`)
  if (dead.length) indexProblems.push(`${dead.length} link(s) to pages not generated: ${dead.slice(0, 5).join(", ")}`)
  console.log(`verify-routes: /currencies/ index — ${pairLinks.length} pair links, ${targets.length} pair pages to link, ${indexProblems.length} problem(s)`)
}
if (indexProblems.length) console.log("  /currencies/: " + indexProblems.join("; "))
if (missing.length || unlisted.length || indexProblems.length) process.exit(1)
