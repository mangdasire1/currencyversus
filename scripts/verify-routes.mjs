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
import { routeCatalog, parsePairSlug, navigateSelection, navigateSwap } from "../src/lib/routes.ts"
import { CURRENCIES } from "../src/lib/currencies.ts"
import { METALS } from "../src/lib/metals.ts"

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out")
if (!fs.existsSync(outDir)) {
  console.error("verify-routes: out/ not found — run `next build` first")
  process.exit(1)
}

const generated = new Set(
  fs.readdirSync(outDir).filter((d) => d.includes("-vs-") && fs.existsSync(path.join(outDir, d, "index.html")))
)

const codes = [...CURRENCIES.map((c) => c.code), ...METALS.map((m) => m.code)]
const reachable = new Set()
for (const slug of routeCatalog()) {
  const current = parsePairSlug(slug) // every catalog slug parses
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
if (missing.length || unlisted.length) process.exit(1)
