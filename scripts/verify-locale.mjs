// Number and date formats by page language (task C3-2): Turkish formatting
// (src/lib/format-tr.ts) must not leak into an English page, and English
// formatting must not show up on a Turkish one. Reads the visible text of every
// built page and sorts it by <html lang>. Fails the build on any hit.
//
// English page (lang="en") — none of:
//   a Turkish number with both separators  4.962,80
//   a Turkish month name                   Kasım, Ağustos …
//   a Turkish percentage                   %60,07
//   "TL" as a currency label               4.962,80 TL
// Turkish page (lang="tr") — none of:
//   an English number with both separators 4,962.80
//   an ISO date in the text                2026-11-21 (Turkish pages write 21.11.2026)
//   an English month abbreviation + year   Nov 2026
//   an English percentage                  60.07%
import fs from "node:fs"
import path from "node:path"

const outDir = path.resolve(process.cwd(), process.argv[2] ?? "out")
const RULES = {
  en: [
    ["Turkish number", /\d{1,3}(?:\.\d{3})+,\d+|\b\d+,\d+\s?(?:TL|\$|€)/],
    // letter boundaries by Unicode: \b would not see the edge of "Şubat" or "Kasım"
    ["Turkish month", /(?<!\p{L})(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)(?!\p{L})/u],
    ["Turkish percentage", /[+\-−~]?%\d/],
    ["TL label", /\d\sTL\b/],
  ],
  tr: [
    ["English number", /\d{1,3}(?:,\d{3})+\.\d+/],
    ["ISO date", /\b\d{4}-\d{2}-\d{2}\b/],
    ["English month", /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}\b/],
    ["English percentage", /\d(?:\.\d+)?%/],
  ],
}

const files = []
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".html")) files.push(p) } }
walk(outDir)

const count = { en: 0, tr: 0 }
const problems = []
for (const f of files) {
  const html = fs.readFileSync(f, "utf8")
  const lang = html.match(/^<!DOCTYPE html><html lang="([a-z]+)"/)?.[1]
  if (!lang) continue // Next's internal _not-found shell
  if (!RULES[lang]) { problems.push(`${path.relative(outDir, f)}: unexpected lang="${lang}"`); continue }
  count[lang]++
  const text = html.replace(/<script\b[\s\S]*?<\/script>/g, " ").replace(/<style\b[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ")
  for (const [what, re] of RULES[lang]) {
    const m = text.match(re)
    if (m) problems.push(`${path.relative(outDir, f)} (lang ${lang}): ${what} "${text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).trim()}"`)
  }
}

console.log(`verify-locale: ${count.en} English and ${count.tr} Turkish pages, ${problems.length} problem(s)`)
if (problems.length) {
  console.log("  " + problems.slice(0, 15).join("\n  "))
  process.exit(1)
}
