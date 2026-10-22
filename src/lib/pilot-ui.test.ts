// Source-level guards for the pilot pair layout (Phase 7).
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { formatBadgeDate, usedDayNote, directionNote, currencyNoun, pairTitle } from "./pilot-format.ts"

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

test("direction colours: up/down are the amber/teal tokens and Direction uses ▲/▼ with a sign", () => {
  const palette = read(`${PILOT_DIR}/palette.ts`)
  assert.match(palette, /up: "#D99A4E"/)
  assert.match(palette, /down: "#52B6C4"/)
  const direction = read(`${PILOT_DIR}/Direction.tsx`)
  assert.match(direction, /"▲"/)
  assert.match(direction, /"▼"/)
  assert.match(direction, /signedPercent/)
})

test("layout contract: one converter, accessible swap, pressed tabs, 44px targets, details in DOM, ad slot reserved", () => {
  const page = read("app/[pair]/PilotPairPageClient.tsx")
  assert.equal((page.match(/<PilotConverter\b/g) ?? []).length, 1, "exactly one control set")
  assert.doesNotMatch(page, /<CurrencyConverter\b/)
  const converter = read(`${PILOT_DIR}/PilotConverter.tsx`)
  assert.match(converter, /aria-label=\{`Swap currencies/)
  assert.match(converter, /min-w-\[44px\] min-h-\[44px\]/)
  const chart = read(`${PILOT_DIR}/PairChart.tsx`)
  assert.match(chart, /aria-pressed=\{/)
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
