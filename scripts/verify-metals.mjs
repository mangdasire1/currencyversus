// Post-build check (Phase 10): every metal page must carry its build-time
// price in the static HTML. The price is the only reason these pages exist;
// rather than publish a metal page without one, the build fails and the
// previous deploy stays live. Rules: src/lib/metal-page-check.ts.
//
//   node --experimental-strip-types scripts/verify-metals.mjs [outDir]   (after `next build`)
//
// outDir defaults to out/; pass another directory to check a copy.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { routeCatalog, parsePairSlug } from "../src/lib/routes.ts"
import { METALS } from "../src/lib/metals.ts"
import { checkMetalPageHtml, checkMetalsIndexHtml } from "../src/lib/metal-page-check.ts"
import { metalsIndexTargets } from "../src/lib/metals-index.ts"

const outDir = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out")
const NAME = Object.fromEntries(METALS.map((m) => [m.code, m.name]))

const pages = routeCatalog().filter((slug) => NAME[parsePairSlug(slug).base])
const failures = []
const samples = []
for (const slug of pages) {
  const { base, target } = parsePairSlug(slug)
  const file = path.join(outDir, slug, "index.html")
  if (!fs.existsSync(file)) {
    failures.push(`${slug}: page missing from ${outDir}`)
    continue
  }
  const quote = NAME[target] ?? target // gold-vs-silver: quoted in silver
  const { problems, price } = checkMetalPageHtml(fs.readFileSync(file, "utf8"), { metalName: NAME[base], quote })
  if (problems.length) failures.push(`${slug}: ${problems.join("; ")}`)
  else if (samples.length < 6 || /^(platinum|palladium)-vs-usd$/.test(slug)) samples.push(`${slug} ${price}`)
}

// The /metals/ index: four prices and a link to every metal page.
const indexFile = path.join(outDir, "metals", "index.html")
const targets = metalsIndexTargets()
if (!fs.existsSync(indexFile)) {
  failures.push(`metals: index page missing from ${outDir}`)
} else {
  const index = checkMetalsIndexHtml(fs.readFileSync(indexFile, "utf8"), METALS.map((m) => ({ name: m.name, code: m.code })), targets)
  if (index.problems.length) failures.push(`metals (index): ${index.problems.join("; ")}`)
  console.log(`verify-metals: /metals/ index — ${index.prices.length}/${METALS.length} prices (${index.prices.join(" · ")}), ${targets.length} metal pages to link, ${index.problems.length} problem(s)`)
}

console.log(`verify-metals: ${pages.length} metal pages, ${pages.length - failures.filter((f) => !f.startsWith("metals")).length} with the build-time price in static HTML, ${failures.length} failing`)
console.log(`  e.g. ${samples.join(" · ")}`)
if (failures.length) {
  console.log("  pages without a price:\n    " + failures.join("\n    "))
  process.exit(1)
}
