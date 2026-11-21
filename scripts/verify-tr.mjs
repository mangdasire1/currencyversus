// Turkish pilot pages in out/ (task C3-5). Fails the build on any problem.
//
// For each of the five pages (src/lib/tr-pages.ts):
// - lang="tr", canonical is the page itself;
// - hreflang en/tr/x-default on the Turkish page AND on its English pair, the
//   same three links on both sides, each pointing to a page in out/; no other
//   page carries hreflang;
// - the visible language link both ways;
// - breadcrumb trail: BreadcrumbList with the Turkish names, and the visible trail;
// - its own share.png (1200x630 PNG, complete) in og:image and twitter:image;
// - links to the other four Turkish pages;
// - currency pages: the 7 Turkish chart tabs and the line, and the same rate
//   as the English page in Turkish format ("1 USD = 50.572 TRY" ⇔ "1 dolar = 50,572 TL");
// - gold pages: the build-time price in the static HTML, the English page's
//   figure in Turkish format (per gram in TL; per troy ounce in USD).
import fs from "node:fs"
import path from "node:path"
import { TR_PAGES, hreflangFor, trCrumbs } from "../src/lib/tr-pages.ts"
import { trNumber } from "../src/lib/format-tr.ts"
import { TR_PERIOD_SHORT } from "../src/lib/pilot-format-tr.ts"

const SITE = "https://currencyversus.com"
const outDir = path.resolve(process.cwd(), process.argv[2] ?? "out")
const problems = []
const fail = (page, what) => problems.push(`${page}: ${what}`)
const html = (p) => { const f = path.join(outDir, p, "index.html"); return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null }
const decode = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
const text = (h) => decode(h.replace(/<script\b[\s\S]*?<\/script>/g, " ").replace(/<style\b[\s\S]*?<\/style>/g, " ").replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ")
const alternates = (h) => Object.fromEntries([...h.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"\/>/g)].map((m) => [m[1], m[2]]))
const fileFor = (url) => path.join(outDir, url.replace(SITE, ""), "index.html")

let checks = 0
const ok = (cond, page, what) => { checks++; if (!cond) fail(page, what) }

for (const p of TR_PAGES) {
  const tr = html(p.tr)
  const en = html(p.en)
  if (!tr) { fail(p.tr, "missing from out/"); continue }
  if (!en) { fail(p.en, "English pair missing from out/"); continue }
  const want = hreflangFor(p.tr)

  ok(/^<!DOCTYPE html><html lang="tr"[ >]/.test(tr), p.tr, `not lang="tr"`)
  ok(tr.includes(`<link rel="canonical" href="${SITE}${p.tr}"/>`), p.tr, "canonical is not the page itself")
  ok(en.includes(`<link rel="canonical" href="${SITE}${p.en}"/>`), p.en, "canonical is not the page itself")
  for (const [page, h] of [[p.tr, tr], [p.en, en]]) {
    const alt = alternates(h)
    ok(JSON.stringify(alt) === JSON.stringify(want), page, `hreflang ${JSON.stringify(alt)} ≠ ${JSON.stringify(want)}`)
    for (const url of Object.values(alt)) ok(fs.existsSync(fileFor(url)), page, `hreflang target ${url} is not a page in out/`)
  }
  ok(tr.includes(`<a href="${p.en}" hrefLang="en" lang="en"`), p.tr, `no "English" link to ${p.en}`)
  ok(en.includes(`<a href="${p.tr}" hrefLang="tr" lang="tr"`), p.en, `no "Türkçe" link to ${p.tr}`)

  // breadcrumbs: structured data and the visible trail, Turkish names
  const crumbs = trCrumbs(p.tr)
  const list = [...tr.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => JSON.parse(m[1])).find((j) => j["@type"] === "BreadcrumbList")
  const got = list ? list.itemListElement.map((i) => `${i.position}|${i.name}|${i.item}`).join(" ") : "none"
  ok(got === crumbs.map((c, i) => `${i + 1}|${c.name}|${SITE}${c.path}`).join(" "), p.tr, `BreadcrumbList ${got}`)
  const trail = tr.match(/<nav aria-label="Sayfa yolu"[\s\S]*?<\/nav>/)?.[0]
  ok(trail && crumbs.every((c) => text(trail).includes(c.name)), p.tr, "visible trail missing or not Turkish")

  // share image
  const img = `${SITE}${p.tr}share.png`
  ok(tr.includes(`<meta property="og:image" content="${img}"/>`) && tr.includes(`<meta name="twitter:image" content="${img}"/>`), p.tr, "og:image / twitter:image is not its share.png")
  const alt = tr.match(/<meta property="og:image:alt" content="([^"]+)"/)?.[1]
  ok(alt && alt !== "CurrencyVersus" && /[çğıöşüİ]/.test(decode(alt)), p.tr, `og:image:alt ${alt ?? "missing"}`)
  const png = path.join(outDir, p.tr, "share.png")
  if (!fs.existsSync(png)) fail(p.tr, "share.png missing from out/")
  else {
    const b = fs.readFileSync(png)
    const isPng = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ok(isPng && b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630 && b.subarray(b.length - 8, b.length - 4).toString("latin1") === "IEND", p.tr, "share.png is not a complete 1200x630 PNG")
  }

  // links to the other Turkish pages
  for (const o of TR_PAGES) if (o.tr !== p.tr) ok(tr.includes(`href="${o.tr}"`), p.tr, `no link to ${o.tr}`)

  // data: present in the static HTML, equal to the English page's
  const t = text(tr)
  const e = text(en)
  if (p.tr === "/tr/dolar-tl/" || p.tr === "/tr/euro-tl/") {
    const base = p.tr === "/tr/dolar-tl/" ? "USD" : "EUR"
    const tabs = [...tr.matchAll(/role="tab"[^>]*>([^<]+)<\/button>/g)].map((m) => m[1])
    ok(JSON.stringify(tabs) === JSON.stringify(Object.values(TR_PERIOD_SHORT)), p.tr, `chart tabs ${JSON.stringify(tabs)}`)
    ok(/<svg role="img" aria-label="[^"]+"[^>]*>[\s\S]*?<path d="M[\d.]+/.test(tr), p.tr, "no chart line in the static HTML")
    const enRate = e.match(new RegExp(`1 ${base} = ([\\d,.]+) TRY`))?.[1]
    const name = base === "USD" ? "dolar" : "euro"
    ok(enRate && t.includes(`1 ${name} = ${trNumber(enRate)} TL`), p.tr, `rate: English "1 ${base} = ${enRate} TRY", Turkish page lacks "1 ${name} = ${enRate ? trNumber(enRate) : "?"} TL"`)
  }
  if (p.tr === "/tr/gram-altin/") {
    const enGram = e.match(/Price per gram ([\d,.]+) TRY/)?.[1]
    ok(enGram && t.includes(`1 gram altın = ${trNumber(enGram)} TL`), p.tr, `price: English "${enGram} TRY" per gram, Turkish page lacks "1 gram altın = ${enGram ? trNumber(enGram) : "?"} TL"`)
  }
  if (p.tr === "/tr/ons-altin/") {
    const enOz = e.match(/1 troy ounce of gold = ([\d,.]+) USD/)?.[1]
    ok(enOz && t.includes(`1 troy ons altın = ${trNumber(enOz)} $`), p.tr, `price: English "${enOz} USD" per troy ounce, Turkish page lacks "1 troy ons altın = ${enOz ? trNumber(enOz) : "?"} $"`)
  }
}

// hreflang only on the ten paired pages
const paired = new Set(TR_PAGES.flatMap((p) => [p.tr, p.en]))
const walk = (d, rel = "/") => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(d, e.name), `${rel}${e.name}/`); else if (e.name === "index.html") {
  checks++
  if (!paired.has(rel) && /<link rel="alternate" hrefLang=/.test(fs.readFileSync(path.join(d, e.name), "utf8"))) fail(rel, "hreflang on a page without a Turkish/English pair")
} } }
walk(outDir)

console.log(`verify-tr: ${TR_PAGES.length} Turkish pages and their English pairs, ${checks} checks, ${problems.length} problem(s)`)
if (problems.length) {
  console.log("  " + problems.slice(0, 20).join("\n  "))
  process.exit(1)
}
