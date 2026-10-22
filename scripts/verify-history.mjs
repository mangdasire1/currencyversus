// Post-build check (Phase 5): every fiat pair page must carry its historical
// comparison in the static HTML — what a crawler gets before JavaScript runs.
// For each page: 7 period rows, each with its label and numeric values, the
// "Then" business day, and the note on observation frequency.
// Works for both the standard layout and the Phase 7 pilot layout.
//
//   node scripts/verify-history.mjs [sampleSize]      (after `next build`)

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out")
const PERIODS = ["1 Month", "3 Months", "6 Months", "1 Year", "3 Years", "5 Years", "10 Years"]
const FIAT = /^[a-z]{3}-vs-[a-z]{3}$/
const sampleSize = Number(process.argv[2] ?? 10)

const text = (h) =>
  h.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()

// Row cells may be <th scope="row"> (pilot layout) or <td> (standard layout).
const CELL = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/g

function check(dir) {
  const html = fs.readFileSync(path.join(outDir, dir, "index.html"), "utf8")
  const problems = []
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? ""
  const rows = [...tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(CELL)].map((c) => text(c[2])))
  const summary = []
  for (const label of PERIODS) {
    const row = rows.find((r) => r[0]?.startsWith(label))
    if (!row) { problems.push(`missing row "${label}"`); continue }
    const rest = row.slice(1).join(" ")
    const numbers = rest.match(/\d[\d,]*\.\d+/g) ?? []
    const thenDate = rest.match(/\d{4}-\d{2}-\d{2}/)?.[0]
    if (numbers.length === 0) problems.push(`"${label}" has no numeric value`)
    if (!thenDate && !/data only from/.test(row[0])) problems.push(`"${label}" has no Then business day`)
    summary.push(`${label}: then ${row[1]?.split(" ")[0] ?? "—"} (${thenDate ?? "n/a"})`)
  }
  const page = text(html)
  const standardNote = /daily ECB reference rates \(one observation per business day, not intraday highs or lows\)/.test(page)
  const pilotNote = /daily ECB reference rate on the last business day on or before the start of the period \(not an intraday level\)/.test(page)
  if (!standardNote && !pilotNote) problems.push("observation-frequency note missing")
  return { dir, problems, summary }
}

const pages = fs.readdirSync(outDir).filter((d) => FIAT.test(d) && fs.existsSync(path.join(outDir, d, "index.html"))).sort()
const results = pages.map(check)
const failed = results.filter((r) => r.problems.length > 0)

// Deterministic "random" sample (seeded by page count) so reruns are comparable.
let seed = pages.length
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
const sample = [...results].sort(() => rand() - 0.5).slice(0, sampleSize)
for (const r of sample) {
  console.log(`  ${r.dir}: ${r.problems.length ? "FAIL " + r.problems.join("; ") : "7/7 rows OK"} — ${r.summary[0]} … ${r.summary[6]}`)
}
console.log(`verify-history: ${pages.length} fiat pair pages, ${pages.length - failed.length} with all 7 periods + values in static HTML, ${failed.length} failing`)
for (const r of failed.slice(0, 10)) console.log(`  FAIL ${r.dir}: ${r.problems.join("; ")}`)
if (failed.length) process.exitCode = 1
