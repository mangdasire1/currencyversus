// Saved data is said to be saved: the Turkish pages, and the English pair,
// metal and ratio pages (which already did).
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { computeConversion } from "./conversion.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), "utf8").replace(/\r\n/g, "\n")

test("stale status: either source failing marks the Turkish pages' conversions, an unused source does not", () => {
  const fx = (base: string, stale: boolean) => ({ base, quote: "TRY", rate: 50, date: "2026-11-20", fetchedAt: null, stale, staleAgeMs: null })
  const metals = (stale: boolean) => ({ XAU: { metal: "XAU", usdPerOz: 3539, priceTime: null, fetchedAt: null, stale, staleAgeMs: null } })
  for (const base of ["USD", "EUR"]) {
    assert.equal(computeConversion({ base, quote: "TRY", fx: fx(base, true) }).status, "stale", base)
    assert.equal(computeConversion({ base, quote: "TRY", fx: fx(base, false) }).status, "ready", base)
  }
  const gram = (fxStale: boolean, metalStale: boolean) => computeConversion({ base: "XAU", quote: "TRY", fx: fx("USD", fxStale), metals: metals(metalStale) }).status
  assert.deepEqual([gram(false, false), gram(true, false), gram(false, true)], ["ready", "stale", "stale"])
  assert.equal(computeConversion({ base: "XAU", quote: "USD", fx: fx("USD", true), metals: metals(false) }).status, "ready") // ons: no FX leg
  assert.equal(computeConversion({ base: "XAU", quote: "USD", metals: metals(true) }).status, "stale")
})

test("Turkish pages: one saved-data note, under the result on the four detail pages and on /tr/", () => {
  const note = read("components", "tr", "TrStaleNote.tsx")
  assert.match(note, /<p role="status"[^>]*color: PV\.up[^>]*>\s*Güncel veri alınamadı; kayıtlı değerler gösteriliyor\.\s*<\/p>/)
  const fx = read("components", "tr", "TrFxPage.tsx")
  assert.match(fx, /const stale = forThisPair && conv\.status === "stale"\n/)
  assert.match(fx, /\{trRateLabel\(target, base, 1 \/ rate\)\}\n\s*<\/p>\n\s*\)\}\n\s*<\/div>\n\s*\{stale && <TrStaleNote \/>\}\n\s*<\/section>/)
  const gold = read("components", "tr", "TrGoldPage.tsx")
  assert.match(gold, /resultNote=\{\s*<>\s*\{resultNote\}[\s\S]*?\{perOz\.status === "stale" && <TrStaleNote \/>\}\s*<\/>/)
  assert.match(read("components", "tr", "TrHomeList.tsx"), /\{stale && <TrStaleNote \/>\}/)
})

test("English pair, metal and ratio pages: the warning they show for saved data", () => {
  assert.match(read("app", "(en)", "[pair]", "PilotPairPageClient.tsx"), /stale=\{forThisPair && conv\.status === "stale"\}/)
  // in the summary, so it is visible while the details are closed
  assert.match(read("components", "pilot", "ProvenanceBadge.tsx"), /<summary\b[\s\S]*\{stale && \([\s\S]*Showing saved data[\s\S]*<\/summary>/)
  assert.match(read("app", "(en)", "[pair]", "MetalPageClient.tsx"), /\{perOz\.status === "stale" && \(\s*<DataFreshness /)
  assert.match(read("components", "DataFreshness.tsx"), /\{conv\.status === "stale" && \([\s\S]{0,120}Showing cached data/)
  const ratio = read("app", "(en)", "[pair]", "MetalRatioPageClient.tsx")
  assert.match(ratio, /const isStale = goldStale \|\| silverStale/)
  assert.match(ratio, /\{isStale && \([\s\S]{0,120}Showing cached data/)
})
