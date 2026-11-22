// Turkish amount input and Turkish sentences of the pair layout (task C3-3):
// amount-tr.ts, pilot-format-tr.ts.
import { test } from "node:test"
import assert from "node:assert/strict"
import { trParseAmount, trAmountErrorMessage, trAmountInput } from "./amount-tr.ts"
import { parseAmount } from "./amount.ts"
import { formatMoney } from "./format.ts"
import { trNumber } from "./format-tr.ts"
import {
  trCurrencyName, TR_PERIOD_SHORT, trObservationSentence, trUsedDayNote, trTwoDatesSentence, trChartAriaLabel, trRateLabel, trSharedLinkNote,
} from "./pilot-format-tr.ts"
import { CHART_PERIODS } from "./history.ts"

test("amount input: comma decimals, dot thousands only in groups; same values as the English policy", () => {
  const ok = (s: string) => { const p = trParseAmount(s); assert.ok(p.ok, s); return p.ok ? [p.value, p.canonical] : null }
  assert.deepEqual(ok("1,5"), [1.5, "1.5"])
  assert.deepEqual(ok("1.000"), [1000, "1000"])
  assert.deepEqual(ok("12.345,67"), [12345.67, "12345.67"])
  assert.deepEqual(ok("100"), [100, "100"])
  assert.deepEqual(ok(",5"), [0.5, ".5"])
  assert.deepEqual(ok("0"), [0, "0"])
  const bad = (s: string) => { const p = trParseAmount(s); assert.ok(!p.ok, s); return p.ok ? null : p.reason }
  assert.equal(bad("1.5"), "dot") // 1,5 or 15? — refused, as English refuses "1,5"
  assert.equal(bad("12.34"), "dot")
  assert.equal(bad(""), "empty")
  assert.equal(bad("-3"), "negative")
  assert.equal(bad("abc"), "invalid")
  assert.equal(bad("1,000,5"), "invalid")
  assert.equal(trAmountErrorMessage("dot"), "Ondalık için virgül (,) kullanın, ör. 1,5")
  assert.equal(trAmountErrorMessage("empty"), null)
  assert.match(trAmountErrorMessage("too-large")!, /1\.000\.000\.000\.000\.000/)
  // every amount the English page accepts is accepted in its Turkish writing, with the same value
  for (const v of [1, 1.5, 100, 999.99, 1000, 12345.67, 1000000, 0.001]) {
    const en = v.toLocaleString("en-US", { maximumFractionDigits: 8 })
    const p = trParseAmount(trNumber(en))
    const e = parseAmount(en)
    assert.ok(p.ok && e.ok && p.value === e.value, `${en} / ${trNumber(en)}`)
  }
  assert.equal(trAmountInput("1000.5"), "1000,5")
})

test("sentences: two dates, used day, observations, rate line, chart label, shared link — Turkish figures, same rounding", () => {
  assert.equal(trCurrencyName("USD"), "dolar")
  assert.equal(trCurrencyName("TRY"), "TL")
  assert.equal(
    trTwoDatesSentence(100, "USD", "TRY", { date: "2016-11-21", value: 336.35 }, { date: "2026-11-20", value: 5057.22 }),
    "100 dolar, 21 Kasım 2016 tarihinde 336,35 TL, 20 Kasım 2026 tarihinde 5.057,22 TL ediyordu (ECB referans kurları).",
  )
  // the target's decimals, as in English (formatMoney)
  assert.ok(trTwoDatesSentence(1, "USD", "TRY", { date: "2016-11-21", value: 3.36354 }, { date: "2026-11-20", value: 50.5722 }).includes(`${trNumber(formatMoney(3.36354, 2))} TL`))
  assert.equal(trUsedDayNote("2016-10-22", "2016-10-21"), "22 Ekim 2016 bir Cumartesi günüydü; bu yüzden ondan önceki son yayın günü, 21 Ekim 2016, kullanıldı.")
  assert.equal(trUsedDayNote("2025-12-25", "2025-12-24"), "25 Aralık 2025 ECB'nin kur yayımlamadığı bir gündü (tatil); bu yüzden ondan önceki son yayın günü, 24 Aralık 2025, kullanıldı.")
  assert.equal(trUsedDayNote("2026-11-20", "2026-11-20"), null)
  assert.equal(trObservationSentence({ sampling: "monthly", observations: 122 }), "Çizgi 122 aylık gözlem kullanıyor. En düşük ve en yüksek değerler, dönemdeki günlük referans kurlarının uç değerleridir; gün içi seviyeler değildir.")
  assert.match(trObservationSentence({ sampling: "daily", observations: 1234 }), /^Çizgi 1\.234 günlük gözlem/)
  assert.equal(trRateLabel("USD", "TRY", 50.5722), "1 dolar = 50,572 TL") // ECB significant digits, as "1 USD = 50.572 TRY"
  assert.equal(
    trChartAriaLabel("USD", "TRY", { points: [{ date: "2016-11-21", rate: 3.3635 }, { date: "2026-11-20", rate: 50.572 }], changePct: 1403.5677, start: null, end: null }),
    "dolar/TL, Kasım 2016 ile Kasım 2026 arasında 3,3635 değerinden 50,572 değerine yükseldi; değişim +%1.403,57",
  )
  assert.match(trSharedLinkNote(null, [], 1), /^Paylaşılan bir bağlantıdan açıldı\. İkinci değer bugünün/)
  assert.match(trSharedLinkNote("2020-01-02", ["amount"], 3), /iki tarih de sabit.*yok sayıldı \(tutar\)\.$/)
  assert.equal(trSharedLinkNote(null, ["amount", "period"], 2), "Bu bağlantının ayarları geçerli değildi; sayfa varsayılan ayarlarıyla açıldı.")
  // every chart period has a Turkish tab label
  for (const p of CHART_PERIODS) assert.ok(TR_PERIOD_SHORT[p.key], p.key)
})
