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
