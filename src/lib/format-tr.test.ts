// Turkish number and date formatting (task C3-2): src/lib/format-tr.ts, and
// the build check that keeps each language's formats on its own pages.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { trNumber, trMoney, trCurrency, trPercent, trDateLong, trDateShort, trUtcTime, trMonthYear } from "./format-tr.ts"
import { formatFxRate, formatMoney, formatRateValue, formatMetalAmount, formatPercentChange } from "./format.ts"
import { formatSignificant } from "./metal-units.ts"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const fromTr = (s: string) => Number(s.replace(/\./g, "").replace(",", ".").replace(/^</, ""))
const fromEn = (s: string) => Number(s.replace(/,/g, "").replace(/^</, ""))
const decimals = (s: string, sep: string) => (s.includes(sep) ? s.split(sep)[1].length : 0)

test("same value, both languages: the task's examples, and the English text unchanged", () => {
  // English, as on the English pages (unchanged)
  assert.equal(formatRateValue(49.628), "49.6280")
  assert.equal(formatMoney(4962.8, 2), "4,962.80")
  assert.equal(formatSignificant(3842.27, 6), "3,842.27")
  // Turkish: the same digits, Turkish separators
  assert.equal(trNumber(formatRateValue(49.628)), "49,6280")
  assert.equal(trMoney(formatMoney(4962.8, 2), "TRY"), "4.962,80 TL")
  assert.equal(trMoney(formatSignificant(3842.27, 6), "USD"), "3.842,27 $")
  assert.equal(trMoney(formatMoney(1234.5, 2), "EUR"), "1.234,50 €")
  assert.equal(trMoney(formatMoney(12.3, 2), "GBP"), "12,30 GBP")
  assert.equal(trCurrency("TRY"), "TL")
  assert.equal(trNumber("—"), "—")
  assert.equal(trNumber("<0.00000001"), "<0,00000001")
})

test("rounding is the English page's: same value and same decimals for every formatter, over many magnitudes", () => {
  const values = [0.0000726, 0.00123, 0.0456, 0.9247, 1, 1.0001, 7.5, 49.62804, 123.456789, 999.995, 1234.5678, 42271.5, 125000.4, 9876543.21]
  let n = 0
  for (const v of values) {
    const texts = [formatFxRate(v, 5), formatFxRate(v, 4), formatRateValue(v), formatMoney(v, 2), formatMoney(v, 0), formatSignificant(v, 6), formatSignificant(v, 5), formatMetalAmount(v, "g"), formatMetalAmount(v, "oz")]
    for (const en of texts) {
      const tr = trNumber(en)
      assert.equal(fromTr(tr), fromEn(en), `${en} → ${tr}`)
      assert.equal(decimals(tr, ","), decimals(en, "."), `${en} → ${tr}: decimals`)
      n++
    }
  }
  assert.equal(n, values.length * 9)
  // anything that is not an English number is refused, so a sentence or an
  // already-Turkish figure cannot be "converted" by accident
  for (const bad of ["4.962,80", "1 USD = 49.6", "abc", "", "49.628%"]) assert.throws(() => trNumber(bad), bad)
})

test("percent: sign of the change in front, % before the number, same ~0% threshold", () => {
  assert.equal(trPercent(formatPercentChange(60.0712)), "+%60,07")
  assert.equal(trPercent(formatPercentChange(-5.1)), "-%5,10")
  assert.equal(trPercent(formatPercentChange(0.004)), "~%0")
  assert.equal(formatPercentChange(60.0712), "+60.07%") // English unchanged
})

test("dates: \"21 Kasım 2026\" in running text, \"21.11.2026\" in tables; UTC time kept in UTC", () => {
  assert.equal(trDateLong("2026-11-21"), "21 Kasım 2026")
  assert.equal(trDateShort("2026-11-21"), "21.11.2026")
  assert.equal(trDateShort("2016-03-04"), "04.03.2016")
  assert.equal(trUtcTime("2026-11-21T13:59:11Z"), "21.11.2026 13:59 UTC")
  assert.equal(trMonthYear("2016-11"), "Kasım 2016")
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
  months.forEach((m, i) => assert.equal(trDateLong(`2026-${String(i + 1).padStart(2, "0")}-01`), `1 ${m} 2026`))
  for (const bad of [null, undefined, "", "2026-13-01", "21.11.2026"]) {
    assert.equal(trDateLong(bad), null)
    assert.equal(trDateShort(bad), null)
  }
})

// The leak check runs after every build (package.json); here it runs on two
// small hand-made sites, one clean and one with each kind of leak.
test("no leak: verify-locale fails a build where a Turkish format is on an English page, or the reverse", () => {
  assert.match(JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).scripts.build, /npm run verify:locale &&/)
  const page = (lang: string, body: string) => `<!DOCTYPE html><html lang="${lang}"><head><title>t</title></head><body>${body}</body></html>`
  const site = (pages: Record<string, string>) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cv-locale-"))
    for (const [p, html] of Object.entries(pages)) { fs.mkdirSync(path.join(dir, path.dirname(p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), html) }
    return dir
  }
  const run = (dir: string) => {
    try { execFileSync(process.execPath, [path.join(ROOT, "scripts", "verify-locale.mjs"), dir], { encoding: "utf8" }); return "ok" }
    catch (e) { return String((e as { stdout: string }).stdout) }
    finally { fs.rmSync(dir, { recursive: true, force: true }) }
  }
  const clean = {
    "usd-vs-try/index.html": page("en", "1 USD = 42.271 TRY · 4,962.80 TRY · +60.07% · 21 Nov 2026 · 2026-11-21 · Türkçe"),
    "tr/dolar-tl/index.html": page("tr", "1 $ = 42,271 TL · 4.962,80 TL · +%60,07 · 21 Kasım 2026 · 21.11.2026 · English"),
  }
  assert.equal(run(site(clean)), "ok")
  const leaks: [string, string, string][] = [
    ["en", "4.962,80 TRY", "Turkish number"],
    ["en", "ECB rate of 21 Kasım 2026", "Turkish month"],
    ["en", "published in Şubat", "Turkish month"], // starts with a non-ASCII letter
    ["en", "change +%60,07", "Turkish percentage"],
    ["en", "42 TL", "TL label"],
    ["tr", "4,962.80 TL", "English number"],
    ["tr", "ECB kuru 2026-11-21", "ISO date"],
    ["tr", "Nov 2026", "English month"],
    ["tr", "değişim 60.07%", "English percentage"],
  ]
  for (const [lang, body, what] of leaks) {
    const out = run(site({ ...clean, "x/index.html": page(lang, body) }))
    assert.match(out, new RegExp(`x[\\\\/]index\\.html \\(lang ${lang}\\): ${what}`), `${lang} "${body}" → ${out}`)
  }
})
