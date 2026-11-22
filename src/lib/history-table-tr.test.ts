// History table on the Turkish currency pages (task C3, fix 2).
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { trHistoryTableText } from "./history-table-tr.ts"
import { formatFxRate } from "./format.ts"
import { TIME_PERIODS } from "./currencies.ts"

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), "utf8")

test("history table text: Turkish columns, periods, figures and dates", () => {
  const t = trHistoryTableText("USD", "TRY")
  assert.equal(t.heading, "Dolar/TL: önceki tarihlerle karşılaştırma")
  assert.deepEqual(t.columns, ["Dönem", "O zaman", "Kullanılan gün", "Değişim"])
  assert.deepEqual(TIME_PERIODS.map((p) => t.period(p.key)), ["1 ay", "3 ay", "6 ay", "1 yıl", "3 yıl", "5 yıl", "10 yıl"])
  assert.equal(t.rate(formatFxRate(3.36354, 5)), "3,3635")
  assert.equal(t.day("2016-11-21"), "21.11.2016")
  assert.equal(t.requested("2016-11-20"), "istenen: 20.11.2016")
  assert.equal(t.coverage("2005-01-03"), "veri yalnızca 03.01.2005 tarihinden itibaren")
  assert.equal(t.now("1 dolar = 50,572 TL", "2026-11-20"), "Şimdi: 1 dolar = 50,572 TL (ECB referans kuru, 20.11.2026)")
  assert.equal(t.now(null, null), "Şimdi: —")
  assert.equal(t.direction, "Sayının yükselmesi, 1 doların daha çok TL ettiği anlamına gelir: elinde dolar olan için iyidir, geliri TL olan için değil.")
  const euro = trHistoryTableText("EUR", "TRY")
  assert.equal(euro.heading, "Euro/TL: önceki tarihlerle karşılaştırma")
  assert.equal(euro.direction, "Sayının yükselmesi, 1 euronun daha çok TL ettiği anlamına gelir: elinde euro olan için iyidir, geliri TL olan için değil.")
  assert.match(t.footnote, /gün içi seviye değildir/)
})

test("history table wiring: the English component with Turkish text, build-time rows on both pages", () => {
  const fx = read("components", "tr", "TrFxPage.tsx")
  assert.match(fx, /<PilotHistoryTable[\s\S]*currentRate=\{rate\}[\s\S]*initialRows=\{initialHistory\}[\s\S]*text=\{trHistoryTableText\(base, target\)\}/)
  for (const [slug, base] of [["dolar-tl", "USD"], ["euro-tl", "EUR"]]) {
    const page = read("app", "(tr)", "tr", slug, "page.tsx")
    assert.ok(page.includes(`getBuildTimeHistory("${base}", "TRY")`), slug)
    assert.match(page, /initialHistory=\{history\}/)
  }
  const table = read("components", "pilot", "PilotHistoryTable.tsx")
  assert.match(table, /<Direction value=\{c\.percentChange\} locale=\{t \? "tr" : "en"\} \/>/) // neutral colours, Turkish percent
  // only the type: English pages must not load the Turkish text
  assert.match(table, /import type \{ HistoryTableText \} from "@\/lib\/history-table-tr"/)
  assert.doesNotMatch(table, /import \{[^}]*\} from "@\/lib\/(history-table-tr|format-tr|pilot-format-tr)"/)
})
