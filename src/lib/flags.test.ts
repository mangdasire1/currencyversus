// No visible flag emoji on any page (Phase 8 follow-up). Flags render as two
// letters on Windows ("US"), so pages show currency codes and names instead.
// The flag field itself stays in the data (src/lib/currencies.ts) and in the
// selector's option object, which Base UI serialises into a hidden form input
// (aria-hidden, 1×1 px) — kept on purpose, not displayed.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []
  )
const FILES = [...walk(path.join(SRC, "app")), ...walk(path.join(SRC, "components"))]
const rel = (f: string) => path.relative(SRC, f).split(path.sep).join("/")

const FLAG_EMOJI = /\p{Regional_Indicator}{2}/u
// Kept on purpose: option data for the hidden form value (not displayed).
const ALLOWED_FLAG_READS = new Set(["components/CurrencySelect.tsx: flag: c.flag"])

test("no page renders a flag: every selector and converter call passes showFlags={false}", () => {
  const hits: string[] = []
  let calls = 0
  for (const f of FILES) {
    const src = fs.readFileSync(f, "utf8")
    for (const m of src.matchAll(/<(CurrencySelect|CurrencyConverter)\b[\s\S]*?\/>/g)) {
      calls++
      // CurrencyConverter forwards its own setting to the selectors it renders
      const ok = rel(f) === "components/CurrencyConverter.tsx" ? /showFlags=\{showFlags\}/.test(m[0]) : /showFlags=\{false\}/.test(m[0])
      if (!ok) hits.push(`${rel(f)}: <${m[1]} … /> without showFlags={false}`)
    }
  }
  console.log(`    ${FILES.length} files in src/app and src/components; ${calls} CurrencySelect/CurrencyConverter calls; without showFlags={false}: ${hits.length}`)
  assert.deepEqual(hits, [])
})

test("flag values are only read behind showFlags (besides the hidden form value) and never written as emoji", () => {
  const hits: string[] = []
  let reads = 0
  for (const f of FILES) {
    const src = fs.readFileSync(f, "utf8")
    if (FLAG_EMOJI.test(src)) hits.push(`${rel(f)}: flag emoji in source`)
    for (const m of src.matchAll(/\.flag\b/g)) {
      reads++
      const line = src.slice(src.lastIndexOf("\n", m.index) + 1, src.indexOf("\n", m.index)).trim()
      if (/flag: c\.flag\b/.test(line) && ALLOWED_FLAG_READS.has(`${rel(f)}: flag: c.flag`)) continue
      if (src.startsWith(".flag === null", m.index)) continue // metal option test, renders nothing
      const before = src.slice(Math.max(0, m.index - 200), m.index)
      if (!/showFlags \?/.test(before)) hits.push(`${rel(f)}: ${line}`)
    }
  }
  console.log(`    .flag reads: ${reads}; ungated: ${hits.length}`)
  assert.deepEqual(hits, [])
})

test("old pair layout: codes and names stay, no code added next to a name", () => {
  const src = fs.readFileSync(path.join(SRC, "app", "[pair]", "PairPageClient.tsx"), "utf8")
  assert.match(src, /\{base\} — \{baseInfo\.name\}/) // "EUR — Euro", not "EUR EUR — Euro"
  assert.match(src, /\{base\} Drivers/)
  assert.match(src, /\{baseInfo\.country\}/)
  assert.doesNotMatch(src, /\{base\} \{baseInfo\.country\}/) // the country name stands alone
  assert.match(src, /\{ label: "Base", value: base \}/)
})

test("shared converter (home, old pair layout): swap, amount field and Refresh are at least 44px", () => {
  const conv = fs.readFileSync(path.join(SRC, "components", "CurrencyConverter.tsx"), "utf8")
  assert.match(conv, /className="swap-btn [^"]*min-w-\[44px\] min-h-\[44px\]/)
  assert.match(conv, /className="flex-1 min-w-0 min-h-\[44px\] bg-transparent/)
  const fresh = fs.readFileSync(path.join(SRC, "components", "DataFreshness.tsx"), "utf8")
  assert.match(fresh, /onClick=\{onRefresh\}[\s\S]{0,250}min-h-\[44px\] min-w-\[44px\]/)
})
