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

// Breadcrumbs (src/lib/breadcrumbs.ts): every pair, metal and index page has
// a visible trail and a BreadcrumbList with the same names, and every step is
// a page in out/ (the site's own URLs, trailing slash).
const SITE = "https://currencyversus.com"
const pageExists = (p) => p === "/" ? fs.existsSync(path.join(outDir, "index.html")) : p.endsWith("/") && fs.existsSync(path.join(outDir, p, "index.html"))
const crumbPages = [...generated, "currencies", "metals"]
const crumbProblems = []
let crumbSteps = 0
for (const page of crumbPages) {
  const html = fs.readFileSync(path.join(outDir, page, "index.html"), "utf8")
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((j) => j["@type"] === "BreadcrumbList")
  const nav = html.replace(/<script\b[\s\S]*?<\/script>/g, "").match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
  if (!ld || !nav) { crumbProblems.push(`${page}: ${!ld ? "no BreadcrumbList" : "no visible trail"}`); continue }
  const visible = [...nav.matchAll(/<(a|span)\b[^>]*>([^<]+)<\/\1>/g)].map((m) => ({ name: m[2], href: m[1] === "a" ? m[0].match(/href="([^"]+)"/)?.[1] : null })).filter((x) => x.name !== "›")
  const items = ld.itemListElement
  if (visible.map((v) => v.name).join("|") !== items.map((i) => i.name).join("|")) crumbProblems.push(`${page}: visible "${visible.map((v) => v.name).join(" › ")}" ≠ data "${items.map((i) => i.name).join(" › ")}"`)
  items.forEach((it, i) => {
    crumbSteps++
    const p = it.item.startsWith(SITE) ? it.item.slice(SITE.length) : null
    if (it.position !== i + 1 || !p || !pageExists(p)) crumbProblems.push(`${page}: step ${i + 1} ${it.item} is not a page in out/`)
    if (i < items.length - 1 && visible[i]?.href !== p) crumbProblems.push(`${page}: visible link ${visible[i]?.href} ≠ ${p}`)
  })
  if (items.at(-1)?.item !== `${SITE}/${page}/`) crumbProblems.push(`${page}: the trail does not end at the page itself`)
}
console.log(`verify-routes: breadcrumbs — ${crumbPages.length} pages, ${crumbSteps} steps, ${crumbProblems.length} problem(s)`)
if (crumbProblems.length) console.log("  " + crumbProblems.slice(0, 10).join("\n  "))
// Share images (src/app/[pair]/share.png): every pair and metal page names
// its own /<page>/share.png as og:image and twitter:image, with alt text, and
// the file is in out/ as a 1200×630 PNG under the platforms' size limits
// (Facebook 8 MB, X 5 MB) and Cloudflare Pages' 25 MiB per file.
const shareProblems = []
let shareBytes = 0
let shareMax = 0
for (const page of generated) {
  const html = fs.readFileSync(path.join(outDir, page, "index.html"), "utf8")
  const want = `${SITE}/${page}/share.png`
  const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]
  const tw = html.match(/<meta name="twitter:image" content="([^"]+)"/)?.[1]
  const alt = html.match(/<meta property="og:image:alt" content="([^"]+)"/)?.[1]
  if (og !== want || tw !== want) shareProblems.push(`${page}: og:image ${og ?? "none"}, twitter:image ${tw ?? "none"}`)
  if (!alt || alt === "CurrencyVersus") shareProblems.push(`${page}: no descriptive og:image:alt`)
  const file = path.join(outDir, page, "share.png")
  if (!fs.existsSync(file)) { shareProblems.push(`${page}: share.png missing from out/`); continue }
  const buf = fs.readFileSync(file)
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const w = isPng ? buf.readUInt32BE(16) : 0, h = isPng ? buf.readUInt32BE(20) : 0
  // complete file: a PNG ends with its IEND chunk (a cut-off file still has a valid header)
  const complete = buf.length > 12 && buf.subarray(buf.length - 8, buf.length - 4).toString("latin1") === "IEND"
  if (!isPng || w !== 1200 || h !== 630) shareProblems.push(`${page}: share.png is not a 1200x630 PNG (${w}x${h})`)
  else if (!complete) shareProblems.push(`${page}: share.png is incomplete (no IEND chunk)`)
  if (buf.length > 5 * 1024 * 1024) shareProblems.push(`${page}: share.png ${buf.length} bytes, over X's 5 MB`)
  shareBytes += buf.length
  shareMax = Math.max(shareMax, buf.length)
}
console.log(`verify-routes: share images — ${generated.size} pages, ${(shareBytes / 1048576).toFixed(1)} MB in all, largest ${(shareMax / 1024).toFixed(0)} KB, ${shareProblems.length} problem(s)`)
if (shareProblems.length) console.log("  " + shareProblems.slice(0, 10).join("\n  "))
if (missing.length || unlisted.length || indexProblems.length || crumbProblems.length || shareProblems.length) process.exit(1)
