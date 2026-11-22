// Turkish share images (task C3-4): card content (og-card.ts), the image
// font's coverage (glyphs.ts) and the wiring of /tr/<page>/share.png.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cmapCodePoints, missingGlyphs } from "./glyphs.ts"
import { trCurrencyCard, trGoldCard, trHomeCard, trMethodCard } from "./og-card.ts"
import type { OgCard } from "./og-card.ts"
import type { ChartPeriod } from "./history.ts"
import { TR_PAIRS } from "./tr-pages.ts"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const SRC = path.join(ROOT, "src")
const GEIST = path.join(ROOT, "node_modules", "next", "dist", "compiled", "@vercel", "og", "Geist-Regular.ttf")
const font = cmapCodePoints(fs.readFileSync(GEIST))

function tenYear(start: number, end: number): ChartPeriod {
  const points = [{ date: "2016-11-21", rate: start }, { date: "2021-06-01", rate: (start + end) / 3 }, { date: "2026-11-20", rate: end }]
  return { key: "10y", short: "10Y", months: 120, sampling: "monthly", requestedStart: "2016-11-21", start: points[0], startShifted: false, end: points[2], changePct: ((end - start) / start) * 100, low: points[1], high: points[2], coverageStart: null, points, observations: 3 }
}
const text = (c: OgCard) => [c.eyebrow, c.title, c.codes, c.figure, c.change?.text, c.change?.label, c.range, ...c.dataLines, c.source].filter(Boolean).join(" | ")
const cards = {
  dolar: trCurrencyCard("USD", "TRY", 50.5722, "2026-11-20", tenYear(3.3635, 50.572)),
  euro: trCurrencyCard("EUR", "TRY", 58.12, "2026-11-20", tenYear(3.6, 58.12)),
  gram: trGoldCard("gram", "1 gram altın = 5.754,2 TL", "2026-11-21T14:55:00Z", "2026-11-20"),
  ons: trGoldCard("ons", "1 troy ons altın = 3.539,00 $", "2026-11-21T14:55:00Z", null),
  yontem: trMethodCard(),
  home: trHomeCard(),
}

test("image font: next/og's Geist draws every Turkish letter; ₺ is missing and never used", () => {
  assert.ok(fs.existsSync(GEIST), GEIST)
  assert.deepEqual(missingGlyphs("çğıİöşüÇĞÖŞÜ ▲▼ – · € $ %", font), [])
  assert.deepEqual(missingGlyphs("178.975 ₺", font), ["₺"]) // why the pages and images write "TL"
  assert.deepEqual(missingGlyphs("a b\nc", font), [])
  for (const [name, c] of Object.entries(cards)) assert.deepEqual(missingGlyphs(text(c) + " " + c.alt, font), [], name)
})

test("Turkish currency card: Turkish names and formats, the 10-year line, neutral direction, no investment wording", () => {
  const c = cards.dolar
  console.log(`    ${text(c)}`)
  assert.equal(c.eyebrow, "Döviz kuru")
  assert.equal(c.title, "Dolar / TL")
  assert.equal(c.codes, "USD / TRY")
  assert.equal(c.figure, "1 dolar = 50,572 TL") // ECB significant digits, as on the page
  assert.deepEqual(c.change, { text: "+%1403,55", kind: "up", label: "dolar/TL kurunun 10 yıldaki değişimi" })
  assert.equal(c.range, "Kasım 2016 – Kasım 2026")
  assert.deepEqual(c.dataLines, ["ECB referans kuru, 20.11.2026"])
  assert.equal(c.source, "Kaynak: Avrupa Merkez Bankası (Frankfurter API üzerinden)")
  assert.ok(c.path && c.path.startsWith("M"))
  assert.equal(c.date, "2026-11-20")
  assert.equal(trCurrencyCard("EUR", "TRY", 58, "2026-11-20", tenYear(58, 58.0001)).change!.kind, "unchanged")
  assert.equal(cards.euro.title, "Euro / TL")
  for (const card of Object.values(cards)) {
    assert.doesNotMatch(text(card) + card.alt, /kazanç|kazandır|getiri|yatırım|fırsat|en ucuz|en iyi|kâr\b/i)
    assert.doesNotMatch(text(card), /\d{4}-\d{2}-\d{2}/) // Turkish dates, not ISO
  }
})

test("Turkish gold cards: the page's figure, provider time in UTC, conversion date on the TL card only; method card has no figure", () => {
  assert.deepEqual([cards.gram.title, cards.gram.figure, cards.gram.codes], ["Gram altın", "1 gram altın = 5.754,2 TL", "XAU / TRY"])
  assert.deepEqual(cards.gram.dataLines, ["Fiyat zamanı 21.11.2026 14:55 UTC (sağlayıcı)", "ECB referans kuruyla çevrildi, 20.11.2026"])
  assert.match(cards.gram.alt, /kuyumcu fiyatı değildir/)
  assert.deepEqual(cards.ons.dataLines, ["Fiyat zamanı 21.11.2026 14:55 UTC (sağlayıcı)"])
  assert.equal(cards.ons.source, "Kaynak: gold-api.com")
  assert.equal(cards.yontem.figure, null)
  assert.doesNotMatch(text(cards.yontem), /\d/)
})

test("wiring: /tr/<page>/share.png for each of the six pages, in og:image and twitter:image; missing glyph fails the build", () => {
  for (const p of TR_PAIRS) {
    const route = fs.readFileSync(path.join(SRC, "app", "(tr)", ...p.tr.split("/").filter(Boolean), "share.png", "route.tsx"), "utf8")
    assert.ok(route.includes(`return trShareImage("${p.tr}")`), p.tr)
    assert.match(route, /export const dynamic = "force-static"/)
  }
  const meta = fs.readFileSync(path.join(SRC, "lib", "tr-metadata.ts"), "utf8")
  assert.match(meta, /url: `\$\{url\}share\.png`/)
  assert.match(meta, /alt: card\.alt/)
  assert.match(meta, /openGraph: \{[^}]*locale: "tr_TR"[^}]*images: \[image\] \}/)
  assert.match(meta, /twitter: \{[^}]*images: \[image\] \}/)
  assert.match(meta, /alternates: alternatesFor\(path\)/)
  const share = fs.readFileSync(path.join(SRC, "lib", "share-image.tsx"), "utf8")
  assert.match(share, /const missing = missingGlyphs\(text, imageFontCoverage\(\)\)\r?\n\s*if \(missing\.length\) throw new Error/)
  assert.match(share, /return drawCard\(card, pair\)/) // English images: the same drawing, the same check
  assert.match(share, /return drawCard\(await trCardFor\(trPath\), trPath\)/)
})
