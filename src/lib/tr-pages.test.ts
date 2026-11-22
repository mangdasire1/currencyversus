// Turkish pilot pages (task C3-1b): src/lib/tr-pages.ts and its wiring.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { TR_HOME, TR_PAGES, TR_PAIRS, TR_NAV, hreflangFor, alternatesFor, languageLinkFor, trCrumbs } from "./tr-pages.ts"
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

test("hreflang: both directions and x-default (English) on the six pairs only; canonical is the page itself", () => {
  for (const p of TR_PAIRS) {
    const want = { en: S + p.en, tr: S + p.tr, "x-default": S + p.en }
    assert.deepEqual(hreflangFor(p.en), want)
    assert.deepEqual(hreflangFor(p.tr), want) // the same set from either side: two-way by construction
    assert.deepEqual(alternatesFor(p.tr), { canonical: S + p.tr, languages: want })
    assert.deepEqual(alternatesFor(p.en), { canonical: S + p.en, languages: want })
  }
  for (const other of ["/eur-vs-usd/", "/try-vs-usd/", "/gold-vs-eur/", "/silver-vs-try/", "/metals/", "/currencies/", "/tr/gumus/"]) {
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

test("Turkish trail: Ana sayfa (/tr/) › the page, two real pages; BreadcrumbList the same", () => {
  for (const p of TR_PAGES) assert.deepEqual(trCrumbs(p.tr), [{ name: "Ana sayfa", path: "/tr/" }, { name: p.crumb, path: p.tr }], p.tr)
  const schema = breadcrumbSchema(trCrumbs("/tr/gram-altin/")) as { itemListElement: { position: number; name: string; item: string }[] }
  assert.deepEqual(schema.itemListElement.map((i) => [i.position, i.name, i.item]), [
    [1, "Ana sayfa", `${S}/tr/`], [2, "Gram altın", `${S}/tr/gram-altin/`],
  ])
  assert.throws(() => trCrumbs(TR_HOME.tr)) // the home has no trail
})

test("Turkish menu and logo stay inside the Turkish pages: Döviz, Altın, Yöntem", () => {
  assert.deepEqual(TR_NAV.map((n) => [n.label, n.href]), [["Döviz", "/tr/#doviz"], ["Altın", "/tr/#altin"], ["Yöntem", "/tr/yontem/"]])
  assert.match(read("components", "Header.tsx"), /<Link href=\{lang === "tr" \? TR_HOME\.tr : "\/"\}/)
  const list = read("components", "tr", "TrHomeList.tsx")
  for (const id of ["doviz", "altin"]) assert.ok(list.includes(`<section id="${id}"`), id)
})

test("Turkish home: paired with /, lists the five pages with the detail pages' own conversion", () => {
  assert.deepEqual(TR_HOME, { tr: "/tr/", en: "/" })
  assert.deepEqual(languageLinkFor("/"), { href: "/tr/", label: "Türkçe", lang: "tr" })
  assert.deepEqual(languageLinkFor("/tr/"), { href: "/", label: "English", lang: "en" })
  assert.match(read("app", "(en)", "page.tsx"), /alternates: alternatesFor\("\/"\)/)
  assert.match(read("app", "(en)", "HomeClient.tsx"), /<Header width="max-w-6xl" languageLink=\{languageLinkFor\("\/"\)\} \/>/)
  assert.doesNotMatch(read("app", "site-metadata.ts"), /languages/) // would reach the 404
  const page = read("app", "(tr)", "tr", "page.tsx")
  const list = read("components", "tr", "TrHomeList.tsx")
  for (const p of TR_PAGES) assert.ok((page + list).includes(`href="${p.tr}"`), p.tr)
  for (const call of [/getInitialRateData\("USD", "TRY"\)/, /getInitialRateData\("EUR", "TRY"\)/, /getBuildTimeMetalPrice\("XAU"\)/]) assert.match(page, call) // build-time → static HTML
  assert.match(list, /formatSignificant\(valueOfWeight\(1, unit, conv\.rate\), conv\.significant\)/)
  assert.match(list, /c\.status === "stale"/) // saved data is said to be saved
})

test("wiring: lang=\"tr\" root layout; every Turkish page uses its own alternates and the shell; English pages link back", () => {
  assert.match(read("app", "(tr)", "layout.tsx"), /<SiteDocument lang="tr" webAppSchema=\{false\}>/)
  for (const p of TR_PAGES) {
    const page = read("app", "(tr)", ...p.tr.split("/").filter(Boolean), "page.tsx")
    assert.ok(page.includes(`const PATH = "${p.tr}"`), p.tr)
    assert.match(page, /return trPageMetadata\(PATH, TITLE, DESCRIPTION\)/) // canonical + hreflang via alternatesFor (tr-metadata.ts)
    assert.match(page, /<TrPageShell path=\{PATH\}/)
  }
  const shell = read("components", "tr", "TrPageShell.tsx")
  assert.match(shell, /<Header width=\{width\} lang="tr" current=\{page\?\.section\} languageLink=\{languageLinkFor\(path\)\} \/>/)
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

test("discovery: the Turkish home and five pages in the sitemap, checked after every build, and linked to each other", () => {
  const ROOT = path.join(SRC, "..")
  const sitemap = fs.readFileSync(path.join(ROOT, "scripts", "sitemap-lastmod.mjs"), "utf8")
  assert.match(sitemap, /import \{ TR_PAIRS \} from "\.\.\/src\/lib\/tr-pages\.ts"/)
  assert.match(sitemap, /const urls = \[[^\n]*\.\.\.TR_PAIRS\.map\(\(p\) => p\.tr\)\]/)
  assert.equal(1 + 3 + routeCatalog().length + TR_PAIRS.length, 259) // home, 3 indexes, 249 pair/metal pages, 6 Turkish
  const build = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).scripts.build as string
  assert.match(build, /npm run verify:tr &&/)
  // every Turkish page links the other four (the shell renders the list)
  const shell = read("components", "tr", "TrPageShell.tsx")
  assert.match(shell, /\{TR_PAGES\.filter\(\(p\) => p\.tr !== path\)\.map\(\(p\) => \(/)
  assert.match(shell, /<Link\s+href=\{p\.tr\}\s+className="inline-flex items-center min-h-\[44px\]/)
})
