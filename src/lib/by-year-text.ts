// Words of the by-year pages, English and Turkish (task C2). Pure — tested in
// by-year.test.ts. Figures come in already formatted; nothing here rounds.

import type { YearlyPair } from "./by-year.ts"
import type { YearRow } from "./yearly.ts"
import { trAblative } from "./yearly.ts"

export interface YearlyText {
  intro: string
  chartHeading: (span: string) => string
  chartLabel: (rows: YearRow[], fmt: (n: number) => string) => string
  chartNote: (latestDate: string) => string
  tableHeading: string
  unit: string
  columns: string[]
  csv: string
  csvNote: string
  method: string
  methodLink: string
  warning: string
  tcmb: string | null
  source: (latestDate: string) => string
  back: string
}

// genitive of the base currency in "1 doların TL karşılığı"
const TR_GENITIVE: Record<string, string> = { USD: "1 doların", EUR: "1 euronun" }

export function yearlyText(pair: YearlyPair, lang: "en" | "tr", first?: number): YearlyText {
  const { base, target } = pair
  if (lang === "tr") {
    const name = pair.tr!.name // "dolar/TL"
    return {
      intro: first === undefined ? "" :
        `Avrupa Merkez Bankası'nın (ECB) günlük referans kurlarından, ${first}'${trAblative(first)} bu yana her yılın yıl sonu kuru, yıl ortalaması, en düşük ve en yüksek kuru. İçinde bulunulan yıl, son yayın gününe kadardır.`,
      chartHeading: (span) => `Yıl sonu kurları (${span})`,
      chartLabel: (rows, fmt) =>
        `${name} yıl sonu kurları, ${rows[0].year}–${rows[rows.length - 1].year}: ${fmt(rows[0].end.rate)} ile başlar, ${fmt(rows[rows.length - 1].end.rate)} ile biter`,
      chartNote: (d) => `Her nokta, o yılın son ECB yayın günündeki kurdur; son nokta ${d} tarihli en son kurdur.`,
      tableHeading: "Yıllık tablo",
      unit: `Rakamlar ${TR_GENITIVE[base]} TL karşılığıdır (ECB referans kuru). Yıllık değişim, önceki yıl sonuna göredir.`,
      columns: ["Yıl", "Yıl sonu", "Yıl ortalaması", "En düşük", "En yüksek", "Yıllık değişim"],
      csv: "Tabloyu CSV olarak indir",
      csvNote: "(ondalık ayracı nokta, tarihler YYYY-AA-GG biçiminde)",
      method:
        `Nasıl hesaplanıyor: Rakamlar ECB'nin iş günlerinde yayımladığı günlük euro referans kurlarından hesaplanır; gün içi piyasa seviyeleri değildir. Bir günün ${name} kuru, iki para biriminin euro kurlarının oranıdır. Yıl sonu kuru, yılın son yayın günündeki kurdur (31 Aralık hafta sonuna ya da tatile denk gelirse ondan önceki son yayın günü). Yıl ortalaması, o yılın günlük kurlarının aritmetik ortalamasıdır. En düşük ve en yüksek, yıl içindeki en düşük ve en yüksek günlük kurdur. Hafta sonları ve ECB tatillerinde kur yayımlanmaz; bu günler hesaba girmez. Rakamlar yalnız gösterimde yuvarlanır ve ECB'nin o yıl yayımladığından fazla anlamlı basamakla gösterilmez.`,
      methodLink: "Yöntem sayfası",
      warning: "Yıllık değişim iki referans kurunu karşılaştırır; bir yatırım getirisi değildir: enflasyonu, faizi ve masrafları hesaba katmaz.",
      tcmb: "Resmi işlemlerde (vergi, gümrük, muhasebe) geçerli kur çoğunlukla TCMB kurudur ve bu sayfadaki ECB referans kurundan farklı olabilir. Bu sayfa TCMB kurunu göstermez.",
      source: (d) => `Kaynak: Avrupa Merkez Bankası (Frankfurter API üzerinden) · Son kur: ${d}`,
      back: `Bugünkü ${name}: çevirici, grafik ve geçmiş tarihlerle karşılaştırma`,
    }
  }
  return {
    intro: first === undefined ? "" :
      `Year-end rate, yearly average, low and high of ${base}/${target} for every year since ${first}, from the European Central Bank's daily reference rates. The current year runs to the latest publication day.`,
    chartHeading: (span) => `Year-end rates, ${span}`,
    chartLabel: (rows, fmt) =>
      `${base}/${target} year-end rates, ${rows[0].year}–${rows[rows.length - 1].year}: from ${fmt(rows[0].end.rate)} to ${fmt(rows[rows.length - 1].end.rate)}`,
    chartNote: (d) => `Each point is the rate on the year's last ECB publication day; the last point is the latest rate, of ${d}.`,
    tableHeading: "Year by year",
    unit: `Figures are 1 ${base} in ${target} (ECB reference rate). The change is from the previous year-end.`,
    columns: ["Year", "Year-end", "Average", "Low", "High", "Change"],
    csv: "Download the table as CSV",
    csvNote: "(dot as decimal separator, ISO dates)",
    method:
      `How these figures are calculated: from the ECB's daily euro reference rates, published on business days — not intraday market levels. A day's ${base}/${target} rate is the ratio of the two currencies' euro rates. The year-end rate is the rate on the year's last publication day (the last one before 31 December when that day is a weekend or holiday). The average is the arithmetic mean of the year's daily rates. Low and high are the year's lowest and highest daily rates. Weekends and ECB holidays have no publication and are not counted. Figures are rounded only for display, to no more significant digits than the ECB published that year.`,
    methodLink: "Method",
    warning: "The yearly change compares two reference rates; it is not an investment return: it leaves out inflation, interest and costs.",
    tcmb: null,
    source: (d) => `Source: European Central Bank via Frankfurter API · Latest rate: ${d}`,
    back: `${base} to ${target} today: converter, chart and comparison with earlier dates`,
  }
}
