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
  const home = fs.readFileSync(path.join(SRC, "app", "(en)", "HomeClient.tsx"), "utf8")
  const cards = [...home.matchAll(/\{ code: "(X[A-Z]{2})", name: "([A-Za-z]+)", href: "\/([a-z-]+)"/g)].map((m) => ({ code: m[1], name: m[2], slug: m[3] }))
  console.log(`    cards: ${cards.map((c) => `${c.name} → /${c.slug}/`).join(", ")}`)
  assert.deepEqual(cards.map((c) => c.code), ["XAU", "XAG", "XPT", "XPD"])
  const catalog = new Set(routeCatalog())
  for (const c of cards) assert.ok(catalog.has(c.slug), `${c.slug} is not a generated page`)
  assert.deepEqual(cards.slice(0, 2).map((c) => c.slug), ["gold-vs-usd", "silver-vs-usd"])
  const page = fs.readFileSync(path.join(SRC, "app", "(en)", "page.tsx"), "utf8")
  for (const code of ["XAU", "XAG", "XPT", "XPD"]) assert.match(page, new RegExp(`getBuildTimeMetalPrice\\("${code}"\\)`)) // prices in the server HTML
})

test("home page: the default pair's rate and history are build-time data seeding the hooks' state", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const app = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app")
  const page = fs.readFileSync(path.join(app, "(en)", "page.tsx"), "utf8")
  const home = fs.readFileSync(path.join(app, "(en)", "HomeClient.tsx"), "utf8")
  assert.match(page, /getInitialRateData\(DEFAULT_BASE, DEFAULT_TARGET\)/)
  assert.match(page, /getBuildTimeHistory\(DEFAULT_BASE, DEFAULT_TARGET\)/)
  // the seed reaches every surface that shows the default pair
  assert.match(home, /useConversion\(base, target, \{ metalUnit: "g", initialFx, initialMetalUsd: initialMetals, initialMetalTime: initialMetalTimes \}\)/)
  assert.match(home, /<CurrencyConverter[\s\S]*?initialFx=\{initialFx\}[\s\S]*?\/>/)
  assert.match(home, /<HomeHistoryTable[^>]*initialRows=\{isDefaultPair \? initialHistory : null\}/)
  // Phase 7 trap: never filled from an effect
  assert.doesNotMatch(home, /useEffect/)
  const hook = fs.readFileSync(path.join(app, "..", "hooks", "useExchangeRate.ts"), "utf8")
  assert.match(hook, /useState<ExchangeRate \| null>\(initialData \?\? null\)/)
  const hist = fs.readFileSync(path.join(app, "..", "hooks", "useHistoricalRates.ts"), "utf8")
  assert.match(hist, /useState<HistoryState \| null>\(\s*initialRows && initialRows\.length > 0 \? \{ pairKey, rows: initialRows, error: null, stale: false, staleAgeMs: null \} : null/)
})

test("home chart: reuses the pair pages' PairChart (no copy), seeded from build-time periods, only for currency pairs", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
  const home = fs.readFileSync(path.join(src, "app", "(en)", "HomeClient.tsx"), "utf8")
  const page = fs.readFileSync(path.join(src, "app", "(en)", "page.tsx"), "utf8")
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

test("site header on every page: one component, the menu to three real pages, aligned to each page's content column", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
  const header = fs.readFileSync(path.join(src, "components", "Header.tsx"), "utf8")
  const nav = [...header.matchAll(/\{ key: "(\w+)", href: "([^"]+)", label: "([^"]+)" \}/g)].map((m) => [m[2], m[3]])
  assert.deepEqual(nav, [["/currencies/", "Currencies"], ["/metals/", "Metals"], ["/method/", "Method"]])
  for (const [href] of nav) assert.ok(fs.existsSync(path.join(src, "app", "(en)", href.slice(1, -1), "page.tsx")), `${href} is a page`)
  for (const m of header.matchAll(/className=\{?[`"]([^`"]*inline-flex[^`"]*)[`"]/g)) assert.match(m[1], /min-h-\[44px\]/)
  assert.match(header, /aria-current=\{current === key \? "page" : undefined\}/)
  assert.doesNotMatch(header.replace(/\/\/.*$/gm, ""), /Powered by ECB/)
  // every page renders it, at its <main>'s width, and has no header of its own
  const pages: Array<[string, string, string | null]> = [
    ["app/(en)/HomeClient.tsx", "max-w-6xl", null],
    ["app/(en)/[pair]/PilotPairPageClient.tsx", "max-w-3xl", "currencies"],
    ["app/(en)/[pair]/MetalPageClient.tsx", "max-w-6xl", "metals"],
    ["app/(en)/[pair]/MetalRatioPageClient.tsx", "max-w-4xl", "metals"],
    ["app/(en)/currencies/page.tsx", "max-w-3xl", "currencies"],
    ["app/(en)/metals/page.tsx", "max-w-3xl", "metals"],
    ["app/(en)/method/page.tsx", "max-w-3xl", "method"],
    ["app/(en)/not-found.tsx", "max-w-3xl", null],
  ]
  for (const [file, width, current] of pages) {
    const code = fs.readFileSync(path.join(src, file), "utf8")
    const call = code.match(/<Header\b[^>]*\/>/)?.[0]
    assert.ok(call, `${file}: no <Header />`)
    assert.match(call!, new RegExp(`width="${width}"`), file)
    assert.match(call!, current ? new RegExp(`current="${current}"`) : /^(?![\s\S]*current=)/, file)
    assert.doesNotMatch(code, /<header\b/, `${file}: a header of its own`)
    if (!file.includes("not-found")) assert.match(code, new RegExp(`<main className="[^"]*${width}`), `${file}: main is not ${width}`)
  }
})

test("home copy names all four metals (no gold-and-silver-only wording on the home page or its meta description)", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const app = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app")
  const home = fs.readFileSync(path.join(app, "(en)", "HomeClient.tsx"), "utf8").replace(/\/\/.*$/gm, "")
  const layoutDescription = fs.readFileSync(path.join(app, "site-metadata.ts"), "utf8").match(/^  description:\s*"([^"]+)"/m)![1]
  for (const [where, text] of [["HomeClient.tsx", home], ["layout.tsx description", layoutDescription]] as const) {
    assert.doesNotMatch(text, /gold and silver prices|\(Gold, Silver\)/i, where)
  }
  assert.equal((home.match(/[Gg]old, silver, platinum and palladium prices/g) ?? []).length, 3)
  assert.match(home, /precious metals \(Gold, Silver, Platinum, Palladium\)/)
  assert.match(layoutDescription, /plus gold, silver, platinum and palladium prices\./)
})

test("home: no Quick Stats card; the inverse rate is on the converter's rate line, only where asked for", async () => {
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
  const home = fs.readFileSync(path.join(src, "app", "(en)", "HomeClient.tsx"), "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*$/gm, "")
  assert.doesNotMatch(home, /Quick Stats|Inverse Rate|Current Rate/)
  assert.match(home, /<CurrencyConverter[\s\S]*?showInverse[\s\S]*?\/>/)
  const conv = fs.readFileSync(path.join(src, "components", "CurrencyConverter.tsx"), "utf8")
  assert.match(conv, /showInverse = false,/) // off unless a page asks
  assert.match(conv, /showInverse && base !== target && conv\.rate !== null \? `\$\{conv\.rateLabel\} · \$\{conv\.inverseRateLabel\}` : conv\.rateLabel/)
  assert.equal((conv.match(/\{rateLine\}/g) ?? []).length, 2)
})

test("shared texts name all four metals: WebApplication JSON-LD, the pair pages' FAQ answer, OG/Twitter", async () => {
  const { getWebApplicationSchema, getFAQItems } = await import("./structured-data.ts")
  const fs = await import("node:fs")
  const path = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const FOUR = /gold, silver, platinum and palladium prices/i
  const app = getWebApplicationSchema() as { description: string }
  assert.match(app.description, FOUR)
  const faq = getFAQItems("USD", "TRY", 42.271, "2026-11-20")
  const source = faq.find((f) => /get its USD\/TRY data/.test(f.question))!
  assert.match(source.answer, /Gold, silver, platinum and palladium prices come separately from gold-api\.com/)
  const layout = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "site-metadata.ts"), "utf8")
  const social = [...layout.matchAll(/^    description: "([^"]+)",$/gm)].map((m) => m[1])
  assert.equal(social.length, 2) // openGraph and twitter
  for (const d of social) {
    assert.match(d, FOUR)
    assert.match(d, /reference rates with up to 10 years of history/) // the history is exchange rates only
  }
  // no text names only gold and silver ("Gold/silver ratio" is a different thing and stays)
  for (const t of [app.description, source.answer, ...social]) assert.doesNotMatch(t, /gold and silver prices|gold\/silver prices/i)
})

test("home converter: the gram/ounce toggle buttons are 44px touch targets", () => {
  const c = fs.readFileSync(path.join(SRC, "components", "CurrencyConverter.tsx"), "utf8")
  const group = c.slice(c.indexOf('aria-label="Metal unit"'), c.indexOf("</div>", c.indexOf('aria-label="Metal unit"')))
  const button = group.match(/<button\b[\s\S]*?(?=<span|<\/button>)/)?.[0] ?? "" // opening tag (its onClick holds a "=>")
  assert.match(button, /aria-pressed=/)
  assert.match(button, /className="[^"]*\bmin-w-\[44px\][^"]*"/, button)
  assert.match(button, /className="[^"]*\bmin-h-\[44px\][^"]*"/, button)
})
