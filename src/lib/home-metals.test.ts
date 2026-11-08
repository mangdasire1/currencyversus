// Home page Precious Metals section (Phase 10): four cards, each linking to a
// page the build generates.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { routeCatalog } from "./routes.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

test("home: four metal cards, each linking to a generated page; gold and silver links unchanged", () => {
  const home = fs.readFileSync(path.join(SRC, "app", "HomeClient.tsx"), "utf8")
  const cards = [...home.matchAll(/\{ code: "(X[A-Z]{2})", name: "([A-Za-z]+)", href: "\/([a-z-]+)"/g)].map((m) => ({ code: m[1], name: m[2], slug: m[3] }))
  console.log(`    cards: ${cards.map((c) => `${c.name} → /${c.slug}/`).join(", ")}`)
  assert.deepEqual(cards.map((c) => c.code), ["XAU", "XAG", "XPT", "XPD"])
  const catalog = new Set(routeCatalog())
  for (const c of cards) assert.ok(catalog.has(c.slug), `${c.slug} is not a generated page`)
  assert.deepEqual(cards.slice(0, 2).map((c) => c.slug), ["gold-vs-usd", "silver-vs-usd"])
  const page = fs.readFileSync(path.join(SRC, "app", "page.tsx"), "utf8")
  for (const code of ["XAU", "XAG", "XPT", "XPD"]) assert.match(page, new RegExp(`getBuildTimeMetalPrice\\("${code}"\\)`)) // prices in the server HTML
})

test("home page: the default pair's rate and history are build-time data seeding the hooks' state", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const app = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app")
  const page = fs.readFileSync(path.join(app, "page.tsx"), "utf8")
  const home = fs.readFileSync(path.join(app, "HomeClient.tsx"), "utf8")
  assert.match(page, /getInitialRateData\(DEFAULT_BASE, DEFAULT_TARGET\)/)
  assert.match(page, /getBuildTimeHistory\(DEFAULT_BASE, DEFAULT_TARGET\)/)
  // the seed reaches every surface that shows the default pair
  assert.match(home, /useConversion\(base, target, \{ metalUnit: "g", initialFx \}\)/)
  assert.match(home, /<CurrencyConverter[\s\S]*?initialFx=\{initialFx\}[\s\S]*?\/>/)
  assert.match(home, /<HistoricalTable [^>]*initialRows=\{isDefaultPair \? initialHistory : null\}/)
  // Phase 7 trap: never filled from an effect
  assert.doesNotMatch(home, /useEffect/)
  const hook = fs.readFileSync(path.join(app, "..", "hooks", "useExchangeRate.ts"), "utf8")
  assert.match(hook, /useState<ExchangeRate \| null>\(initialData \?\? null\)/)
  const hist = fs.readFileSync(path.join(app, "..", "hooks", "useHistoricalRates.ts"), "utf8")
  assert.match(hist, /useState<HistoryState \| null>\(\s*initialRows && initialRows\.length > 0 \? \{ pairKey, rows: initialRows, error: null \} : null/)
})

test("home chart: reuses the pair pages' PairChart (no copy), seeded from build-time periods, only for currency pairs", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
  const home = fs.readFileSync(path.join(src, "app", "HomeClient.tsx"), "utf8")
  const page = fs.readFileSync(path.join(src, "app", "page.tsx"), "utf8")
  assert.match(home, /import \{ PairChart \} from "@\/components\/pilot\/PairChart"/)
  assert.doesNotMatch(home, /<svg|chartGeometry|<path/) // drawn by PairChart only
  assert.match(page, /getBuildTimeChart\(DEFAULT_BASE, DEFAULT_TARGET\)/)
  assert.match(home, /usePairChart\(base, target, isDefaultPair \? initialChart : null\)/)
  assert.match(home, /const fxPair = base !== target && !isMetal\(base\) && !isMetal\(target\)/)
  const hook = fs.readFileSync(path.join(src, "hooks", "usePairChart.ts"), "utf8")
  assert.match(hook, /useState<ChartState \| null>\(\s*initialPeriods && initialPeriods\.length > 0 \? \{ pairKey, periods: initialPeriods, error: null \} : null/)
  assert.match(hook, /deriveChartPeriods\(series, today\)/) // the build-time derivation, not a second one
  // table and chart share one series request per pair
  const hist = fs.readFileSync(path.join(src, "hooks", "useHistoricalRates.ts"), "utf8")
  assert.match(hist, /fetchPairSeries\(base, target, start, end, signal\)/)
  assert.match(hook, /fetchPairSeries\(base, target, start, end, controller\.signal\)/)
})
