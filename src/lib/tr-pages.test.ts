// Turkish pilot pages (task C3-1b): src/lib/tr-pages.ts and its wiring.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { TR_PAGES, TR_NAV, hreflangFor, alternatesFor, languageLinkFor, trCrumbs } from "./tr-pages.ts"
import { breadcrumbSchema } from "./breadcrumbs.ts"
import { routeCatalog } from "./routes.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), "utf8")
const S = "https://currencyversus.com"

test("five pages: ASCII addresses under /tr/, each paired with a generated English page", () => {
  assert.deepEqual(TR_PAGES.map((p) => [p.tr, p.en]), [
    ["/tr/dolar-tl/", "/usd-vs-try/"],
    ["/tr/euro-tl/", "/eur-vs-try/"],
    ["/tr/gram-altin/", "/gold-vs-try/"],
    ["/tr/ons-altin/", "/gold-vs-usd/"],
    ["/tr/yontem/", "/method/"],
  ])
  const catalog = new Set(routeCatalog())
  for (const p of TR_PAGES) {
    assert.match(p.tr, /^\/tr\/[a-z-]+\/$/, `${p.tr}: ASCII letters only`)
    assert.ok(p.en === "/method/" || catalog.has(p.en.slice(1, -1)), `${p.en} is not a generated page`)
    assert.ok(fs.existsSync(path.join(SRC, "app", "(tr)", ...p.tr.split("/").filter(Boolean), "page.tsx")), `${p.tr}: page missing`)
  }
})

test("hreflang: both directions and x-default (English) on the five pairs only; canonical is the page itself", () => {
  for (const p of TR_PAGES) {
    const want = { en: S + p.en, tr: S + p.tr, "x-default": S + p.en }
    assert.deepEqual(hreflangFor(p.en), want)
    assert.deepEqual(hreflangFor(p.tr), want) // the same set from either side: two-way by construction
    assert.deepEqual(alternatesFor(p.tr), { canonical: S + p.tr, languages: want })
    assert.deepEqual(alternatesFor(p.en), { canonical: S + p.en, languages: want })
  }
  for (const other of ["/eur-vs-usd/", "/try-vs-usd/", "/gold-vs-eur/", "/silver-vs-try/", "/metals/", "/"]) {
    assert.equal(hreflangFor(other), null, other)
    assert.deepEqual(alternatesFor(other), { canonical: S + other }, other)
  }
})

test("language link: \"Türkçe\" on the English page, \"English\" on the Turkish one, none elsewhere", () => {
  assert.deepEqual(languageLinkFor("/usd-vs-try/"), { href: "/tr/dolar-tl/", label: "Türkçe", lang: "tr" })
  assert.deepEqual(languageLinkFor("/tr/dolar-tl/"), { href: "/usd-vs-try/", label: "English", lang: "en" })
  assert.deepEqual(languageLinkFor("/method/"), { href: "/tr/yontem/", label: "Türkçe", lang: "tr" })
  for (const other of ["/eur-vs-usd/", "/try-vs-usd/", "/gold-vs-eur/", "/currencies/"]) assert.equal(languageLinkFor(other), null, other)
})

test("Turkish trail and menu: Ana sayfa › Döviz › Dolar/TL, Ana sayfa › Altın › Gram altın; BreadcrumbList in Turkish", () => {
  const names = (p: string) => trCrumbs(p).map((c) => c.name).join(" › ")
  assert.equal(names("/tr/dolar-tl/"), "Ana sayfa › Döviz › Dolar/TL")
  assert.equal(names("/tr/euro-tl/"), "Ana sayfa › Döviz › Euro/TL")
  assert.equal(names("/tr/gram-altin/"), "Ana sayfa › Altın › Gram altın")
  assert.equal(names("/tr/ons-altin/"), "Ana sayfa › Altın › Ons altın")
  assert.equal(names("/tr/yontem/"), "Ana sayfa › Yöntem")
  const schema = breadcrumbSchema(trCrumbs("/tr/gram-altin/")) as { itemListElement: { position: number; name: string; item: string }[] }
  assert.deepEqual(schema.itemListElement.map((i) => [i.position, i.name, i.item]), [
    [1, "Ana sayfa", `${S}/`], [2, "Altın", `${S}/metals/`], [3, "Gram altın", `${S}/tr/gram-altin/`],
  ])
  // menu: Turkish labels; the indexes are English pages for now, the method page is Turkish
  assert.deepEqual(TR_NAV.map((n) => [n.label, n.href]), [["Döviz", "/currencies/"], ["Metaller", "/metals/"], ["Yöntem", "/tr/yontem/"]])
})

test("wiring: lang=\"tr\" root layout; every Turkish page uses its own alternates and the shell; English pages link back", () => {
  assert.match(read("app", "(tr)", "layout.tsx"), /<SiteDocument lang="tr" webAppSchema=\{false\}>/)
  for (const p of TR_PAGES) {
    const page = read("app", "(tr)", ...p.tr.split("/").filter(Boolean), "page.tsx")
    assert.ok(page.includes(`const PATH = "${p.tr}"`), p.tr)
    assert.match(page, /alternates: alternatesFor\(PATH\)/)
    assert.match(page, /<TrPageShell path=\{PATH\}/)
  }
  const shell = read("components", "tr", "TrPageShell.tsx")
  assert.match(shell, /<Header width=\{width\} lang="tr" current=\{page\.section\} languageLink=\{languageLinkFor\(path\)\} \/>/)
  assert.match(shell, /<Breadcrumbs crumbs=\{trCrumbs\(path\)\} label="Sayfa yolu" \/>/)
  const header = read("components", "Header.tsx")
  assert.match(header, /const nav = lang === "tr" \? TR_NAV : NAV/)
  assert.match(header, /hrefLang=\{languageLink\.lang\}\s+lang=\{languageLink\.lang\}/)
  // English side: hreflang through alternatesFor, the link through languageLinkFor
  const pairPage = read("app", "(en)", "[pair]", "page.tsx")
  assert.equal((pairPage.match(/alternates: alternatesFor\(/g) ?? []).length, 2) // currency and metal pages
  assert.match(read("app", "(en)", "method", "page.tsx"), /alternates: alternatesFor\("\/method\/"\)[\s\S]*languageLink=\{languageLinkFor\("\/method\/"\)\}/)
  assert.match(read("app", "(en)", "[pair]", "PilotPairPageClient.tsx"), /languageLink=\{languageLinkFor\(pairPath\(base, target\)\)\}/)
  assert.match(read("app", "(en)", "[pair]", "MetalPageClient.tsx"), /languageLink=\{languageLinkFor\(pairPath\(metal, target\)\)\}/)
})
