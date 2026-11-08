// Source-level guards for the pilot pair layout (Phase 7).
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { formatBadgeDate, usedDayNote, directionNote, currencyNoun, pairTitle } from "./pilot-format.ts"
import { directionOf } from "./chart.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8")
const PILOT_DIR = "components/pilot"
const PILOT_FILES = [
  ...fs.readdirSync(path.join(SRC, PILOT_DIR)).map((f) => `${PILOT_DIR}/${f}`),
  "app/[pair]/PilotPairPageClient.tsx",
]

// Green/red as direction colours pass a value judgement (a rising rate is good
// for one reader, bad for another). Direction is sign + ▲/▼; colour amber/teal.
const GREEN_RED = /\b(green|red|emerald|rose|lime)(-\d{2,3})?\b|#(10b981|ef4444|22c55e|16a34a|dc2626|f43f5e|34d399|f87171)\b|positive-change|negative-change/i

test("direction colours: no green/red token or class in the pilot layout", () => {
  const hits: string[] = []
  for (const f of PILOT_FILES) {
    read(f).split("\n").forEach((line, i) => {
      const isComment = /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)
      if (!isComment && GREEN_RED.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`)
    })
  }
  console.log(`    scanned ${PILOT_FILES.length} files: ${PILOT_FILES.map((f) => path.basename(f)).join(", ")}`)
  assert.deepEqual(hits, [])
})

// Phase 9: the home page follows the same rule. Every file it imports
// (transitively, within src) is scanned — not a fixed list, so a component
// added later is covered too.
function importGraph(entry: string): string[] {
  const seen = new Set<string>()
  const stack = [path.join(SRC, entry)]
  const resolve = (from: string, spec: string) => {
    const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null
    if (!base) return null
    for (const ext of ["", ".ts", ".tsx"]) if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return base + ext
    return null
  }
  while (stack.length) {
    const f = stack.pop()!
    if (seen.has(f)) continue
    seen.add(f)
    for (const m of fs.readFileSync(f, "utf8").matchAll(/(?:import|export)[^"']*?from\s+["']([^"']+)["']/g)) {
      const r = resolve(f, m[1])
      if (r && /\.tsx?$/.test(r)) stack.push(r)
    }
  }
  return [...seen].map((f) => path.relative(SRC, f).split(path.sep).join("/")).sort()
}
// Red as an error colour is not a direction: the shared converter's
// "unavailable" message (also on the old layout's 194 pages, left as is).
const ERROR_RED = new Set(["components/CurrencyConverter.tsx: <p className=\"text-red-400 text-sm\">{missingMessage()}</p>"])

test("direction colours: no green/red in anything the home page renders (whole import graph)", () => {
  const files = importGraph("app/HomeClient.tsx")
  const hits: string[] = []
  for (const f of files) {
    read(f).split("\n").forEach((line, i) => {
      const isComment = /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)
      if (!isComment && GREEN_RED.test(line) && !ERROR_RED.has(`${f}: ${line.trim()}`)) hits.push(`${f}:${i + 1}: ${line.trim()}`)
    })
  }
  console.log(`    home import graph: ${files.length} files; green/red direction hits: ${hits.length}`)
  assert.ok(files.includes("components/HomeHistoryTable.tsx") && files.includes("components/Sparkline.tsx"))
  assert.ok(!files.includes("components/PercentChange.tsx"), "the green/red change badge is not used on the home page")
  assert.deepEqual(hits, [])
})

test("home table: no repeated Now column; the current rate is stated once above the table", () => {
  const t = read("components/HomeHistoryTable.tsx")
  const heads = [...t.matchAll(/<th className="[^"]*">([^<]+)<\/th>/g)].map((m) => m[1])
  assert.deepEqual(heads, ["Period", "Then", "Change", "Low", "High", "Trend"])
  assert.equal((t.match(/Now: \{currentLabel/g) ?? []).length, 1)
  assert.match(t, /<Direction value=\{c\.percentChange\} \/>/)
  assert.match(t, /upColor=\{PV\.up\}\s+downColor=\{PV\.down\}/)
  assert.match(t, /<div className="overflow-x-auto">/) // the table scrolls sideways on phones, not squeezed
})

test("direction colours: up/down are the amber/teal tokens and the arrows are ▲/▼", () => {
  const palette = read(`${PILOT_DIR}/palette.ts`)
  assert.match(palette, /up: "#D99A4E"/)
  assert.match(palette, /down: "#52B6C4"/)
  const direction = read(`${PILOT_DIR}/Direction.tsx`)
  assert.match(direction, /directionOf\(value\)/)
  const chart = read("lib/chart.ts")
  assert.match(chart, /arrow: "▲"/)
  assert.match(chart, /arrow: "▼"/)
})

test("direction: no arrow and no sign when the change rounds to 0.00%", () => {
  const cases: Array<[number, string | null, string, string]> = [
    [0, null, "0.00%", "unchanged"],
    [0.004, null, "0.00%", "unchanged"], // was "▲ +0.00%"
    [-0.0049, null, "0.00%", "unchanged"], // was "▼ -0.00%"
    [0.006, "▲", "+0.01%", "up"],
    [-0.006, "▼", "-0.01%", "down"],
    [1511.4, "▲", "+1511.40%", "up"],
    [-93.74, "▼", "-93.74%", "down"],
  ]
  for (const [p, arrow, text, kind] of cases) {
    assert.deepEqual(directionOf(p), { kind, arrow, text }, String(p))
  }
  console.log(`    ${cases.map(([p]) => `${p} → ${directionOf(p).arrow ?? "(no arrow)"} ${directionOf(p).text}`).join(" | ")}`)
  const direction = read(`${PILOT_DIR}/Direction.tsx`)
  assert.match(direction, /\{d\.arrow && </) // the arrow element is not rendered at all
})

// WCAG 2 relative luminance / contrast ratio
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test("selected period tab: white on #4F46E5 meets WCAG AA (white on #6366F1 did not)", () => {
  const palette = read(`${PILOT_DIR}/palette.ts`)
  assert.match(palette, /selectedFill: "#4F46E5"/)
  const chart = read(`${PILOT_DIR}/PairChart.tsx`)
  assert.match(chart, /background: p\.key === period\.key \? PV\.selectedFill : PV\.raised/)
  assert.match(chart, /color: p\.key === period\.key \? "#FFFFFF"/)
  const now = contrast("#FFFFFF", "#4F46E5")
  const before = contrast("#FFFFFF", "#6366F1")
  console.log(`    white on #6366F1 ${before.toFixed(2)}:1 (before) → white on #4F46E5 ${now.toFixed(2)}:1; 14px text needs 4.5:1`)
  assert.ok(before < 4.5)
  assert.ok(now >= 4.5)
})

// Regional-indicator pairs (🇺🇸 …) — what a flag emoji is made of.
const FLAG_EMOJI = /\p{Regional_Indicator}{2}/u

test("new layout: no flag emoji anywhere — title, From/To selectors, every component", () => {
  const page = read("app/[pair]/PilotPairPageClient.tsx")
  assert.match(page, /\{base\} \/ \{target\}/) // title: codes only
  const hits: string[] = []
  for (const f of PILOT_FILES) {
    const src = read(f)
    if (/\.flag\b/.test(src)) hits.push(`${f}: reads .flag`)
    if (FLAG_EMOJI.test(src)) hits.push(`${f}: flag emoji in source`)
    // a shared selector shows flags unless told not to
    for (const m of src.matchAll(/<CurrencySelect\b[^>]*\/>/g)) {
      if (!/showFlags=\{false\}/.test(m[0])) hits.push(`${f}: ${m[0]}`)
    }
  }
  const selects = PILOT_FILES.reduce((n, f) => n + (read(f).match(/<CurrencySelect\b/g) ?? []).length, 0)
  console.log(`    scanned ${PILOT_FILES.length} new-layout files; CurrencySelect uses: ${selects}, all with showFlags={false}; hits: ${hits.length}`)
  assert.equal(selects, 2) // From and To
  assert.deepEqual(hits, [])
})

test("period tabs: one single-choice group (tablist/tab/aria-selected), keyboard, no toggle buttons", () => {
  const chart = read(`${PILOT_DIR}/PairChart.tsx`)
  assert.doesNotMatch(chart, /aria-pressed/, "toggle buttons announce seven independent on/off controls")
  assert.doesNotMatch(chart, /role="(checkbox|switch|group)"/)
  assert.match(chart, /role="tablist"/)
  assert.match(chart, /role="tab"/)
  assert.match(chart, /aria-selected=\{p\.key === period\.key\}/)
  assert.match(chart, /aria-controls=\{panelId\}/)
  assert.match(chart, /role="tabpanel"/)
  assert.match(chart, /tabIndex=\{p\.key === period\.key \? 0 : -1\}/) // roving tab stop
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) assert.match(chart, new RegExp(`"${key}"`))
})

test("swap carries period and date to the reverse pair, not the amount", () => {
  const nav = read("hooks/usePairNavigation.ts")
  assert.match(nav, /nav\.path === pairPath\(target, base\)/)
  assert.match(nav, /period: string\n\s+date: string\n\}/) // CarriedView has no amount
  const page = read("app/[pair]/PilotPairPageClient.tsx")
  assert.match(page, /usePairNavigation\(base, target, carry\)/)
  assert.match(page, /takeCarriedView\(pairPath\(base, target\)\)/)
  assert.match(page, /selected=\{period\} onSelect=\{setPeriod\}/)
  assert.match(page, /date=\{thenDate\}/)
})

test("layout contract: one converter, accessible swap, 44px targets, details in DOM, ad slot reserved", () => {
  const page = read("app/[pair]/PilotPairPageClient.tsx")
  assert.equal((page.match(/<PilotConverter\b/g) ?? []).length, 1, "exactly one control set")
  assert.doesNotMatch(page, /<CurrencyConverter\b/)
  const converter = read(`${PILOT_DIR}/PilotConverter.tsx`)
  assert.match(converter, /aria-label=\{`Swap currencies/)
  assert.match(converter, /min-w-\[44px\] min-h-\[44px\]/)
  const chart = read(`${PILOT_DIR}/PairChart.tsx`)
  assert.match(chart, /min-w-\[44px\] min-h-\[44px\]/)
  assert.match(chart, /overflow-x-auto/)
  assert.match(chart, /height: BOX\.height/) // fixed plot height (no layout shift)
  const badge = read(`${PILOT_DIR}/ProvenanceBadge.tsx`)
  assert.match(badge, /<details\b/) // native details: text is in the DOM, not injected
  assert.match(page, /AD SLOT \(reserved, intentionally empty\)/)
})

test("text helpers", () => {
  assert.equal(formatBadgeDate("2026-10-22"), "22 Oct 2026")
  assert.equal(usedDayNote("2016-10-22", "2016-10-21"), "2016-10-22 was a Saturday, so the last published business day, 2016-10-21, was used.")
  assert.equal(usedDayNote("2026-04-03", "2026-04-02"), "2026-04-03 had no ECB publication (a holiday), so the last published business day, 2026-04-02, was used.")
  assert.equal(usedDayNote("2026-10-21", "2026-10-21"), null)
  assert.equal(currencyNoun("USD"), "US dollar")
  assert.equal(currencyNoun("TRY", true), "Turkish lira")
  assert.equal(currencyNoun("BRL", true), "Brazilian reais")
  assert.equal(directionNote("USD", "TRY"), "A rising number means one US dollar buys more Turkish lira — good for someone holding US dollars, not for someone earning Turkish lira.")
  assert.equal(pairTitle("USD", "TRY"), "US Dollar to Turkish Lira")
})
