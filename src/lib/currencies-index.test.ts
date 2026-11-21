// The /currencies/ index page: what it links to.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { currenciesIndex, currenciesIndexTargets, CURRENCIES_INDEX_PATH } from "./currencies-index.ts"
import { routeCatalog, parsePairSlug } from "./routes.ts"
import { CURRENCIES } from "./currencies.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

test("currencies index: links every currency pair page the build generates, and only those", () => {
  const entries = currenciesIndex()
  assert.equal(entries.length, CURRENCIES.length)
  for (const e of entries) assert.equal(e.links.length, CURRENCIES.length - 1, e.code)
  const pairs = routeCatalog().filter((s) => { const p = parsePairSlug(s)!; return CURRENCIES.some((c) => c.code === p.base) && CURRENCIES.some((c) => c.code === p.target) })
  const targets = currenciesIndexTargets()
  console.log(`    ${targets.length} links (${pairs.length} currency pair pages)`)
  assert.deepEqual([...targets].map((t) => t.slice(1, -1)).sort(), [...pairs].sort())
  const usd = entries.find((e) => e.code === "USD")!
  assert.deepEqual(usd.links.find((l) => l.target === "TRY"), { href: "/usd-vs-try/", text: "US Dollar to Turkish Lira (USD/TRY)", target: "TRY" })
  assert.equal(CURRENCIES_INDEX_PATH, "/currencies/")
})

test("currencies index: server-rendered, in the sitemap, checked by the build, linked from the home and method pages", () => {
  const page = fs.readFileSync(path.join(SRC, "app", "currencies", "page.tsx"), "utf8")
  assert.doesNotMatch(page, /"use client"|useEffect|useState/)
  assert.match(page, /canonical: "https:\/\/currencyversus\.com\/currencies\/"/)
  for (const m of page.matchAll(/<(Link|a)\b[\s\S]*?>/g)) assert.match(m[0], /min-h-\[44px\]/, m[0])
  assert.match(fs.readFileSync(path.join(SRC, "..", "scripts", "sitemap-lastmod.mjs"), "utf8"), /"\/currencies\/"/)
  assert.match(fs.readFileSync(path.join(SRC, "..", "scripts", "verify-routes.mjs"), "utf8"), /currenciesIndexTargets\(\)/)
  assert.match(fs.readFileSync(path.join(SRC, "app", "HomeClient.tsx"), "utf8"), /<Link href="\/currencies\/"/)
  assert.match(fs.readFileSync(path.join(SRC, "app", "method", "page.tsx"), "utf8"), /<Link href="\/currencies\/"/)
})
