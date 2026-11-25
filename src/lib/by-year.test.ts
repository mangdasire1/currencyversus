// By-year pages (task C2): addresses, titles, trails, hreflang, the table's
// figures and the CSV, the share card and the links to the pages.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  YEARLY_PAIRS, yearlyPath, yearlyCsvPath, yearlyPairByTrPath, yearlyTitleEn, yearlyH1En, yearlyTitleTr, yearlyH1Tr,
  yearlyCrumbsEn, yearlyCrumbsTr, yearCells, yearlyCsv, rateText, changeText, newestFirst, CSV_COLUMNS, yearlySlugs,
} from "./by-year.ts"
import { yearlyText } from "./by-year-text.ts"
import { yearlyRows } from "./yearly.ts"
import type { DailyEuroRates, YearRow } from "./yearly.ts"
import { hreflangFor, alternatesFor, languageLinkFor, trCrumbs, TR_YEARLY_PAIRS, TR_PAIRS } from "./tr-pages.ts"
import { yearlyCard, trYearlyCard } from "./og-card.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const read = (...p: string[]) => fs.readFileSync(path.join(here, "..", ...p), "utf8")
const SITE = "https://currencyversus.com"

// rows 2005–2026 for USD/TRY
const euro: DailyEuroRates = {}
for (let y = 2005; y <= 2026; y++) {
  euro[`${y}-01-03`] = { USD: 1.2, TRY: 1.6 + (y - 2005) * 2 }
  euro[`${y}-12-30`] = { USD: 1.1, TRY: 2 + (y - 2005) * 2.5 }
}
const rows: YearRow[] = yearlyRows(euro, "USD", "TRY", new Date("2026-11-25T12:00:00Z"))

test("by-year: six pairs in English, two of them in Turkish, at the agreed addresses", () => {
  assert.deepEqual(YEARLY_PAIRS.map((p) => yearlyPath(p.base, p.target)), [
    "/usd-vs-try/by-year/", "/eur-vs-try/by-year/", "/usd-vs-eur/by-year/", "/eur-vs-gbp/by-year/", "/eur-vs-chf/by-year/", "/usd-vs-jpy/by-year/",
  ])
  assert.deepEqual(yearlySlugs(), ["usd-vs-try", "eur-vs-try", "usd-vs-eur", "eur-vs-gbp", "eur-vs-chf", "usd-vs-jpy"])
  assert.deepEqual(TR_YEARLY_PAIRS, [
    { tr: "/tr/dolar-tl/yillara-gore/", en: "/usd-vs-try/by-year/" },
    { tr: "/tr/euro-tl/yillara-gore/", en: "/eur-vs-try/by-year/" },
  ])
  assert.equal(yearlyCsvPath("USD", "TRY"), "/usd-vs-try/by-year.csv")
  // not among the Turkish menu pages (their list, checks and sitemap entries)
  assert.ok(!TR_PAIRS.some((p) => p.tr.includes("yillara-gore")))
})

test("by-year: titles and headings as agreed", () => {
  assert.equal(yearlyTitleEn("USD", "TRY", rows), "USD to TRY by year (2005–2026): year-end, average, high and low")
  assert.equal(yearlyH1En("USD", "TRY"), "US Dollar to Turkish Lira by year")
  const usd = yearlyPairByTrPath("/tr/dolar-tl/yillara-gore/")!
  assert.equal(yearlyTitleTr(usd, rows), "Dolar kaç TL'ydi? Yıllara göre dolar/TL (2005–2026)")
  assert.equal(yearlyH1Tr(usd), "Yıllara göre dolar/TL")
  const eur = yearlyPairByTrPath("/tr/euro-tl/yillara-gore/")!
  assert.equal(yearlyTitleTr(eur, rows), "Euro kaç TL'ydi? Yıllara göre euro/TL (2005–2026)")
})

test("by-year: breadcrumb trails in both languages", () => {
  assert.deepEqual(yearlyCrumbsEn("USD", "TRY").map((c) => `${c.name}→${c.path}`), [
    "Home→/", "Currencies→/currencies/", "USD to TRY→/usd-vs-try/", "By year→/usd-vs-try/by-year/",
  ])
  const trail = ["Ana sayfa→/tr/", "Dolar/TL→/tr/dolar-tl/", "Yıllara göre→/tr/dolar-tl/yillara-gore/"]
  assert.deepEqual(yearlyCrumbsTr(yearlyPairByTrPath("/tr/dolar-tl/yillara-gore/")!).map((c) => `${c.name}→${c.path}`), trail)
  assert.deepEqual(trCrumbs("/tr/dolar-tl/yillara-gore/").map((c) => `${c.name}→${c.path}`), trail)
  assert.deepEqual(trCrumbs("/tr/euro-tl/yillara-gore/").map((c) => c.name), ["Ana sayfa", "Euro/TL", "Yıllara göre"])
})

test("by-year: hreflang both ways for the two pairs with a Turkish page only", () => {
  const want = { en: `${SITE}/usd-vs-try/by-year/`, tr: `${SITE}/tr/dolar-tl/yillara-gore/`, "x-default": `${SITE}/usd-vs-try/by-year/` }
  assert.deepEqual(hreflangFor("/usd-vs-try/by-year/"), want)
  assert.deepEqual(hreflangFor("/tr/dolar-tl/yillara-gore/"), want)
  assert.deepEqual(alternatesFor("/eur-vs-try/by-year/").languages?.tr, `${SITE}/tr/euro-tl/yillara-gore/`)
  for (const p of ["/usd-vs-eur/by-year/", "/eur-vs-gbp/by-year/", "/eur-vs-chf/by-year/", "/usd-vs-jpy/by-year/"]) {
    assert.deepEqual(alternatesFor(p), { canonical: `${SITE}${p}` }, p)
    assert.equal(languageLinkFor(p), null, p)
  }
  assert.deepEqual(languageLinkFor("/usd-vs-try/by-year/"), { href: "/tr/dolar-tl/yillara-gore/", label: "Türkçe", lang: "tr" })
  assert.deepEqual(languageLinkFor("/tr/euro-tl/yillara-gore/"), { href: "/eur-vs-try/by-year/", label: "English", lang: "en" })
})

test("by-year: figures rounded only for display, to the ECB's significant digits, no thousands separator", () => {
  assert.equal(rateText(49.73779, 5), "49.738")
  assert.equal(rateText(131.917, 4), "131.9")
  assert.equal(rateText(0.924712, 4), "0.9247")
  assert.equal(rateText(5.95006, 5), "5.9501")
  assert.equal(rateText(1398.5913, 6), "1398.59") // no "1,398.59"
  // each figure with its own day's precision: 2022, EUR/USD below 1 for part of the year
  const y2022 = yearlyRows({ "2022-01-03": { USD: 1.1355, TRY: 15.0767 }, "2022-09-27": { USD: 0.9632, TRY: 17.7802 }, "2022-12-30": { USD: 1.0666, TRY: 19.9649 } }, "USD", "TRY", new Date("2026-11-25T00:00:00Z"))[0]
  const c = yearCells(y2022)
  assert.equal(c.end, "18.718") // 5 digits: both legs of 30 Dec carry 5 or more
  assert.equal(c.high, "18.718")
  assert.equal(c.low, "13.278")
  assert.equal(c.average, "16.82") // 4 digits (16.818…): 0.9632 on 27 Sep carries 4
  assert.equal(changeText(null), "")
  assert.equal(changeText(0.004), "0.00")
  assert.equal(changeText(-0.004), "0.00")
  assert.equal(changeText(12.345), "12.35")
  assert.equal(changeText(-5.1), "-5.10")
})

test("by-year: the CSV is the table — same rows, same order, same figures; dot decimal, ISO dates", () => {
  const csv = yearlyCsv(rows)
  const lines = csv.trimEnd().split("\n")
  assert.equal(lines[0], CSV_COLUMNS.join(","))
  assert.equal(lines[0], "year,coverage,first_day,year_end_date,year_end_rate,average,low,low_date,high,high_date,change_from_previous_year_end_pct,publication_days")
  assert.equal(lines.length, 1 + rows.length)
  const table = newestFirst(rows).map(yearCells)
  lines.slice(1).forEach((line, i) => {
    const f = line.split(",")
    const c = table[i]
    assert.deepEqual(f, [String(c.year), c.coverage, c.first, c.endDate, c.end, c.average, c.low, c.lowDate, c.high, c.highDate, c.change, String(c.days)])
    for (const d of [f[2], f[3], f[7], f[9]]) assert.match(d, /^\d{4}-\d{2}-\d{2}$/)
    for (const n of [f[4], f[5], f[6], f[8]]) assert.match(n, /^\d+(\.\d+)?$/)
  })
  assert.equal(lines[1].split(",")[0], "2026")
  assert.equal(lines[1].split(",")[1], "year_to_date")
  assert.equal(lines.at(-1)!.split(",")[0], "2005")
  assert.equal(lines.at(-1)!.split(",")[10], "", "first year: no change")
  assert.ok(!/;|"/.test(csv))
})

test("by-year: the notes — warning, Turkish TCMB note in hedged words, no regulation named", () => {
  const usd = yearlyPairByTrPath("/tr/dolar-tl/yillara-gore/")!
  const tr = yearlyText(usd, "tr", 2005)
  assert.equal(tr.warning, "Yıllık değişim iki referans kurunu karşılaştırır; bir yatırım getirisi değildir: enflasyonu, faizi ve masrafları hesaba katmaz.")
  assert.match(tr.tcmb!, /çoğunlukla TCMB kurudur/)
  assert.match(tr.tcmb!, /farklı olabilir/)
  assert.match(tr.tcmb!, /Bu sayfa TCMB kurunu göstermez\./)
  assert.doesNotMatch(tr.tcmb!, /[Tt]ebliğ|[Kk]anun|[Yy]önetmelik|[Mm]evzuat|VUK|[Mm]adde/)
  assert.match(tr.intro, /2005'ten bu yana/)
  const en = yearlyText(YEARLY_PAIRS[2], "en", 1999)
  assert.equal(en.tcmb, null)
  assert.equal(en.warning, "The yearly change compares two reference rates; it is not an investment return: it leaves out inflation, interest and costs.")
  for (const t of [tr, en]) {
    assert.match(t.method, /(intraday|gün içi)/)
    assert.match(t.method, /(weekend|hafta sonu)/i)
  }
})

test("by-year: share card — the year-end line, the years, the source; no figure, no change", () => {
  const line = { points: rows.map((r) => ({ date: r.end.date, rate: r.end.rate })), firstYear: 2005, lastYear: 2026, latestDate: "2026-11-20" }
  const en = yearlyCard("USD", "TRY", line)
  assert.equal(en.title, "US Dollar to Turkish Lira by year")
  assert.equal(en.range, "2005 to 2026")
  assert.equal(en.figure, null)
  assert.equal(en.change, null)
  assert.match(en.path!, /^M0,/)
  assert.match(en.source, /European Central Bank/)
  assert.equal(en.date, "2026-11-20")
  const tr = trYearlyCard("USD", "TRY", line)
  assert.equal(tr.title, "Yıllara göre dolar/TL")
  assert.equal(tr.range, "2005 – 2026")
  assert.deepEqual(tr.dataLines, ["Yıl sonu ECB referans kurları; son kur 20.11.2026"])
  assert.match(tr.alt, /[çğıöşü]/)
})

test("by-year: pages, CSV and images are routes of their own; linked from the pair pages, /currencies/ and /tr/", () => {
  const en = read("app", "(en)", "[pair]", "by-year", "page.tsx")
  assert.match(en, /export const dynamicParams = false/)
  assert.match(en, /yearlySlugs\(\)\.map\(\(pair\) => \(\{ pair \}\)\)/)
  assert.match(en, /alternates: alternatesFor\(path\)/)
  assert.match(en, /<Breadcrumbs crumbs=\{yearlyCrumbsEn\(p\.base, p\.target\)\} \/>/)
  assert.match(read("app", "(en)", "[pair]", "by-year.csv", "route.ts"), /new Response\(yearlyCsv\(rows\), \{ headers: \{ "Content-Type": "text\/csv; charset=utf-8" \} \}\)/)
  assert.match(read("app", "(en)", "[pair]", "by-year", "share.png", "route.tsx"), /yearlyShareImage\(p\.base, p\.target, "en"\)/)
  for (const s of ["dolar-tl", "euro-tl"]) {
    assert.match(read("app", "(tr)", "tr", s, "yillara-gore", "page.tsx"), new RegExp(`const PATH = "/tr/${s}/yillara-gore/"`))
    assert.match(read("app", "(tr)", "tr", s, "yillara-gore", "share.png", "route.tsx"), new RegExp(`trYearlyShareImage\\("/tr/${s}/yillara-gore/"\\)`))
  }
  // pair page → by-year
  assert.match(read("app", "(en)", "[pair]", "PilotPairPageClient.tsx"), /\{yearlyPair\(base, target\) && \(\s*<p[^>]*>\s*<Link href=\{yearlyPath\(base, target\)\}/)
  assert.match(read("components", "tr", "TrFxPage.tsx"), /\{yearlyPairByTrPath\(`\$\{path\}yillara-gore\/`\) && \(\s*<p[^>]*>\s*<Link href=\{`\$\{path\}yillara-gore\/`\}/)
  // by-year → pair page
  assert.match(read("components", "yearly", "YearlyView.tsx"), /<Link href=\{tr \? pair\.tr!\.pairPath : pairPath\(base, target\)\}/)
  // indexes
  assert.match(read("app", "(en)", "currencies", "page.tsx"), /\{YEARLY_PAIRS\.map\(\(p\) => \(\s*<li key=\{`\$\{p\.base\}\$\{p\.target\}`\}>\s*<Link\s+href=\{yearlyPath\(p\.base, p\.target\)\}/)
  assert.match(read("app", "(tr)", "tr", "page.tsx"), /\{TR_YEARLY_PAIRS\.map\(\(p\) => \(\s*<li key=\{p\.tr\}>\s*<Link href=\{p\.tr\}/)
})

test("by-year: the eight pages in the sitemap, the CSV files not; checked by verify-by-year in every build", () => {
  const root = path.join(here, "..", "..")
  const sitemap = fs.readFileSync(path.join(root, "scripts", "sitemap-lastmod.mjs"), "utf8")
  assert.match(sitemap, /urls\.push\(\.\.\.YEARLY_PAIRS\.map\(\(p\) => yearlyPath\(p\.base, p\.target\)\), \.\.\.TR_YEARLY_PAIRS\.map\(\(p\) => p\.tr\)\)/)
  assert.doesNotMatch(sitemap, /yearlyCsvPath|\.csv/)
  assert.equal(YEARLY_PAIRS.length + TR_YEARLY_PAIRS.length, 8)
  const build = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts
  assert.match(build.build, /npm run verify:by-year &&/)
  assert.equal(build["verify:by-year"], "node scripts/verify-by-year.mjs")
})

test("by-year: both method pages explain the yearly figures, and the pages link that paragraph", () => {
  const en = read("app", "(en)", "method", "page.tsx")
  const tr = read("app", "(tr)", "tr", "yontem", "page.tsx")
  const enP = en.match(/<p id="by-year">([\s\S]*?)<\/p>/)?.[1].replace(/\s+/g, " ") ?? ""
  const trP = tr.match(/<p id="yillara-gore">([\s\S]*?)<\/p>/)?.[1].replace(/\s+/g, " ") ?? ""
  for (const w of ["year-end rate", "arithmetic mean", "lowest and highest daily", "previous one", "latest publication day", "3 January 2005", "significant digits", "CSV"]) assert.ok(enP.includes(w), w)
  for (const w of ["yıl sonu kurunu", "aritmetik ortalaması", "en düşük ve en yüksek günlük", "önceki yıl sonu", "son yayın gününe", "3 Ocak 2005", "anlamlı basamak", "CSV"]) assert.ok(trP.includes(w), w)
  assert.match(read("components", "yearly", "YearlyView.tsx"), /<Link href=\{tr \? "\/tr\/yontem\/#yillara-gore" : "\/method\/#by-year"\}/)
})

test("by-year: table newest first in the static HTML, scrolling inside its own box; chart drawn by chartGeometry", () => {
  const view = read("components", "yearly", "YearlyView.tsx")
  assert.doesNotMatch(view, /"use client"/)
  assert.match(view, /<div className="relative overflow-x-auto rounded-xl"[^>]*>\s*<table className="w-full min-w-\[640px\]/)
  assert.match(view, /\{newestFirst\(rows\)\.map\(\(r\) => \{\s*const c = yearCells\(r\)/)
  assert.match(view, /const g = chartGeometry\(points, BOX\)/)
  assert.match(view, /<Direction value=\{c\.changePct\} locale=\{lang\} \/>/)
  // text in the table in `dim`, never `faint`: a row's 1px line is drawn inside the
  // cells, and faint on that line is 4.35:1 (measured at 414 px), dim 5.53:1
  const table = view.slice(view.indexOf("<table"), view.indexOf("</table>"))
  assert.doesNotMatch(table, /PV\.faint/)
  assert.equal(table.match(/className="block text-xs" style=\{\{ color: PV\.dim \}\}/g)?.length, 3)
  // the CSV link: the same file from both languages
  assert.match(view, /<a href=\{yearlyCsvPath\(base, target\)\} download/)
  assert.deepEqual(newestFirst(rows).map((r) => r.year).slice(0, 3), [2026, 2025, 2024])
})
