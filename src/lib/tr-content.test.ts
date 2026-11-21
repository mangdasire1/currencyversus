// Turkish pilot pages' content (task C3-3): the shared components in Turkish,
// the notes the task requires, and the content rules.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), "utf8")
const page = (slug: string) => read("app", "(tr)", "tr", slug, "page.tsx")
const code = (s: string) => s.replace(/^\s*\/\/.*$/gm, "") // without line comments

test("shared components: English by default, Turkish only with locale=\"tr\"", () => {
  for (const [f, sig] of [
    ["components/pilot/PairChart.tsx", /locale = "en" \}: PairChartProps/],
    ["components/pilot/TwoDatesTool.tsx", /locale = "en",\n\}: TwoDatesToolProps/],
    ["components/pilot/Direction.tsx", /locale = "en" \}: \{/],
    ["components/MetalUnitConverter.tsx", /locale = "en", initialUnit = DEFAULT_WEIGHT_UNIT, resultNote \}/],
  ] as const) {
    const src = read(...f.split("/")).replace(/\r\n/g, "\n")
    assert.match(src, sig, f)
    assert.match(src, /const tr = locale === "tr"|locale === "tr" \?/, f)
  }
})

test("currency pages: 7-period chart, two-dates tool with its share link, and a short visible note on what the rate is", () => {
  const fx = read("components", "tr", "TrFxPage.tsx")
  assert.match(fx, /<PairChart [^>]*locale="tr" \/>/)
  assert.match(fx, /<TwoDatesTool[\s\S]*sharePath=\{path \+ query\}[\s\S]*locale="tr"/)
  assert.match(fx, /readShareState\(window\.location\.search/) // the English page's share link rules
  // the note: ECB daily reference rate, ~16:00 CET on business days, not a live rate, not a bank's buy/sell rate
  const note = fx.replace(/\s+/g, " ")
  for (const t of ["günlük referans kurudur", "iş günlerinde yaklaşık 16:00 CET", "Canlı piyasa kuru değildir", "döviz bürosunun alış/satış kuru da değildir"]) assert.ok(note.includes(t), t)
  for (const [slug, base] of [["dolar-tl", "USD"], ["euro-tl", "EUR"]]) {
    const p = page(slug)
    assert.match(p, new RegExp(`getInitialRateData\\("${base}", "TRY"\\), getBuildTimeChart\\("${base}", "TRY"\\)`), slug) // build-time data → static HTML
    assert.match(p, /<TrFxPage/)
  }
})

test("gram gold: gram and TL by default; the theoretical-value note right under the result; no karat or coin figures", () => {
  const g = page("gram-altin").replace(/\s+/g, " ")
  assert.match(g, /target="TRY"/)
  assert.match(g, /initialUnit="g"/)
  assert.match(g, /resultNote=\{ <p/) // rendered by the converter directly under the result sentence
  for (const t of ["1 gram saf altının spot fiyattan <strong>teorik değeridir</strong>", "Kuyumcudaki gram altın, bankadaki altın hesabı ve Kapalıçarşı fiyatları", "alış/satış farkı", "işçilik", "vergi", "Aradaki fark doğaldır; bu sayfa o fiyatları göstermez."]) assert.ok(g.includes(t), t)
  assert.ok(g.includes("22 ayar, 14 ayar, çeyrek, yarım, tam, Cumhuriyet altını ve bilezik için rakam verilmez"))
  // no figure next to any of those products
  // "22 ayar" is a product's name; what must not appear is a price, weight or TL figure for any of them
  assert.doesNotMatch(g, /(çeyrek|yarım|tam,|Cumhuriyet|bilezik|ayar)[^.<]{0,60}(\d+[.,]\d|TL\b|\$|\bgram\b)/i)
  const conv = read("components", "MetalUnitConverter.tsx")
  assert.match(conv, /\{sentence \?\? \(status \|\| "—"\)\}\s*<\/p>\s*\{resultNote\}/)
})

test("ounce gold: USD per troy ounce, the one-sentence explanation, 31,1035 g from the constant, a link to gram gold", () => {
  const o = page("ons-altin").replace(/\s+/g, " ")
  assert.match(o, /target="USD"/)
  assert.match(o, /initialUnit="ozt"/)
  assert.ok(o.includes("denince altının troy ons başına <strong style={{ color: PV.text }}>dolar</strong>{\" \"} cinsinden fiyatı kastedilir"))
  assert.match(o, /const OUNCE_G = trNumber\(GRAMS_PER_TROY_OUNCE\.toFixed\(4\)\)/) // 31,1035, not typed by hand
  assert.match(o, /href="\/tr\/gram-altin\/"/)
})

test("method page: the English page's sections in Turkish, plus why bank and jeweller prices differ — mechanism, no figures", () => {
  const m = page("yontem")
  for (const h of ["Döviz kurları", "Altın ve diğer değerli metaller", "Tarihsel veriler", "Bankadaki kur ve kuyumcudaki altın fiyatı neden farklı?", "Hata bildirimi"]) assert.ok(m.includes(`title="${h}"`), h)
  for (const t of ["Çapraz kur.", "TL ve TRY.", "Birimler.", "ISSUES_URL"]) assert.ok(m.includes(t), t)
  const why = m.slice(m.indexOf('title="Bankadaki kur'), m.indexOf('title="Hata bildirimi"'))
  assert.doesNotMatch(code(why).replace(/<[^>]+>/g, " ").replace(/\{[^}]*\}/g, " "), /\d/) // mechanism only, no numbers
})

test("content rules on every Turkish file: no ranking, no advice, no promise; not marked as reviewed", () => {
  const files = [
    ...["dolar-tl", "euro-tl", "gram-altin", "ons-altin", "yontem"].map((s) => page(s)),
    read("components", "tr", "TrFxPage.tsx"), read("components", "tr", "TrGoldPage.tsx"), read("components", "tr", "TrPageShell.tsx"),
    read("lib", "pilot-format-tr.ts"),
  ]
  for (const f of files) {
    const t = code(f)
    assert.doesNotMatch(t, /en ucuz|en iyi|en çok|en güvenilir|en doğru|kazandır|kazanç|getiri sağla|tavsiye ederiz|öneririz|yatırım yapın|satın alın/i)
    // "yatırım" only in disclaimers ("yatırım tavsiyesi değildir", "yatırım getirisi değildir")
    for (const m of t.matchAll(/yatırım\s+\S+\s+\S+/gi)) assert.match(m[0], /yatırım (tavsiyesi|getirisi) değil/i, m[0])
    assert.doesNotMatch(t, /editorialReviewLabel|EDITORIAL_REVIEWED/)
  }
})
