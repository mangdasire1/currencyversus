// Turkish text for the pair layout's components (task C3-3): the Turkish
// counterparts of the English sentences in pilot-format.ts, history.ts and
// chart.ts. Pure — tested in pilot-format-tr.test.ts. Every figure goes
// through format-tr.ts, rounded by the same English formatters.

import { CURRENCY_MAP } from "./currencies.ts"
import { formatFxRate, formatMoney } from "./format.ts"
import { pairSignificantDigits } from "./ecb.ts"
import { signedPercent } from "./chart.ts"
import type { ChartPeriod, ChartSampling } from "./history.ts"
import type { TwoDatesPoint } from "./pilot-format.ts"
import { trNumber, trMoney, trPercent, trDateLong, trMonthYear } from "./format-tr.ts"

// Names in running Turkish text: "100 dolar", "1 euro", "4.962,80 TL".
const NAME_TR: Record<string, string> = { USD: "dolar", EUR: "euro", TRY: "TL" }
export function trCurrencyName(code: string): string {
  return NAME_TR[code] ?? code
}

// Chart tabs, written out: the tabs scroll sideways on narrow screens.
export const TR_PERIOD_SHORT: Record<string, string> = { "1m": "1 ay", "3m": "3 ay", "6m": "6 ay", "1y": "1 yıl", "3y": "3 yıl", "5y": "5 yıl", "10y": "10 yıl" }

const SAMPLING_TR: Record<ChartSampling, (n: string) => string> = {
  daily: (n) => `${n} günlük gözlem`,
  "every-2nd-business-day": (n) => `iki iş gününde bir alınan ${n} gözlem`,
  "every-3rd-business-day": (n) => `üç iş gününde bir alınan ${n} gözlem`,
  weekly: (n) => `${n} haftalık gözlem`,
  monthly: (n) => `${n} aylık gözlem`,
}

// Same facts as observationSentence (history.ts), from the period's own data.
export function trObservationSentence(p: Pick<ChartPeriod, "sampling" | "observations">): string {
  return `Çizgi ${SAMPLING_TR[p.sampling](trNumber(p.observations.toLocaleString("en-US")))} kullanıyor. En düşük ve en yüksek değerler, dönemdeki günlük referans kurlarının uç değerleridir; gün içi seviyeler değildir.`
}

const WEEKDAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]

// Same rule as usedDayNote (pilot-format.ts): only when the provider's business
// day differs from the date asked for.
export function trUsedDayNote(requested: string, used: string | null): string | null {
  if (!used || used === requested) return null
  const dow = new Date(`${requested}T00:00:00Z`).getUTCDay()
  const why = dow === 0 || dow === 6 ? `bir ${WEEKDAYS_TR[dow]} günüydü` : "ECB'nin kur yayımlamadığı bir gündü (tatil)"
  return `${trDateLong(requested)} ${why}; bu yüzden ondan önceki son yayın günü, ${trDateLong(used)}, kullanıldı.`
}

// "100 dolar, 21 Kasım 2016 tarihinde 336,35 TL, 20 Kasım 2026 tarihinde
//  4.227,10 TL ediyordu (ECB referans kurları)." Same rounding as
// twoDatesSentence: the target's own decimals, the amount up to the base's.
export function trTwoDatesSentence(amount: number, base: string, target: string, first: TwoDatesPoint, second: TwoDatesPoint): string {
  const dec = CURRENCY_MAP[target]?.decimals ?? 2
  const amountText = trNumber(amount.toLocaleString("en-US", { maximumFractionDigits: CURRENCY_MAP[base]?.decimals ?? 2 }))
  return `${amountText} ${trCurrencyName(base)}, ${trDateLong(first.date)} tarihinde ${trMoney(formatMoney(first.value, dec), target)}, ${trDateLong(second.date)} tarihinde ${trMoney(formatMoney(second.value, dec), target)} ediyordu (ECB referans kurları).`
}

// Same content as chartAriaLabel (chart.ts).
export function trChartAriaLabel(base: string, target: string, p: Pick<ChartPeriod, "points" | "changePct" | "start" | "end">): string {
  const pair = `${trCurrencyName(base)}/${trCurrencyName(target)}`
  const first = p.points[0]
  const last = p.points.at(-1)
  if (!first || !last) return `${pair}: bu dönem için veri yok`
  const from = p.start ?? first
  const to = p.end ?? last
  const sig = pairSignificantDigits(base, target)
  const verb = to.rate > from.rate ? "yükseldi" : to.rate < from.rate ? "düştü" : "değişmedi"
  const change = p.changePct !== null ? `; değişim ${trPercent(signedPercent(p.changePct))}` : ""
  return `${pair}, ${trMonthYear(from.date)} ile ${trMonthYear(to.date)} arasında ${trNumber(formatFxRate(from.rate, sig))} değerinden ${trNumber(formatFxRate(to.rate, sig))} değerine ${verb}${change}`
}

// "1 dolar = 42,271 TL" — the rate line, ECB significant digits.
export function trRateLabel(base: string, target: string, rate: number): string {
  return `1 ${trCurrencyName(base)} = ${trNumber(formatFxRate(rate, pairSignificantDigits(base, target)))} ${trCurrencyName(target)}`
}

// Same cases as sharedLinkNote (share-state.ts).
const SHARE_FIELD_TR: Record<string, string> = { amount: "tutar", period: "dönem", from: "birinci tarih", to: "ikinci tarih" }
export function trSharedLinkNote(to: string | null, ignored: readonly string[], present: number): string {
  if (present > 0 && ignored.length === present) return "Bu bağlantının ayarları geçerli değildi; sayfa varsayılan ayarlarıyla açıldı."
  const base =
    to === null
      ? "Paylaşılan bir bağlantıdan açıldı. İkinci değer bugünün ECB referans kurunu kullanır; bu yüzden gönderenin gördüğünden farklı olabilir."
      : "Paylaşılan bir bağlantıdan açıldı: iki tarih de sabit; iki değer de o günlerin ECB referans kurlarıdır ve değişmez."
  return ignored.length ? `${base} Bağlantının geçerli olmayan kısımları yok sayıldı (${ignored.map((f) => SHARE_FIELD_TR[f] ?? f).join(", ")}).` : base
}
