// Content of the per-page share image (package B6). Pure — tested in
// og-card.test.ts; drawn by src/lib/share-image.tsx.
//
// What a card says, and only that:
// - the pair's name and codes; for currency pairs the 10-year line and its
//   change, for metal pages the price per troy ounce;
// - the data date (ECB reference rate date; the metal provider's time);
// - the source and the site name.
// No headline that reads like an investment result: the change is labelled
// as a change in the exchange rate over the period, with sign and arrow in
// the site's neutral direction colours (amber up, teal down), never
// green/red, and no arrow when it rounds to 0.00%.
// Text is plain ASCII: the image font has no "▲▼₺" glyphs, and a missing
// glyph would make the renderer fetch a font during the build.

import { CURRENCIES } from "./currencies.ts"
import { METALS } from "./metals.ts"
import { directionOf } from "./chart.ts"
import { chartGeometry } from "./chart.ts"
import type { ChartBox } from "./chart.ts"
import type { ChartPeriod } from "./history.ts"
import { trPercent, trMonthYear, trDateShort, trUtcTime } from "./format-tr.ts"
import { trCurrencyName, trRateLabel } from "./pilot-format-tr.ts"

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CHART_BOX: ChartBox = { width: 1040, height: 220, padTop: 8, padBottom: 8 }

const NAME: Record<string, string> = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.name]))
const METAL: Record<string, string> = Object.fromEntries(METALS.map((m) => [m.code, m.name]))

export interface OgCard {
  eyebrow: string // "Exchange rate" / "Metal price"
  title: string // "US Dollar to Turkish Lira"
  codes: string // "USD / TRY"
  figure: string | null // "1 USD = 50.572 TRY"
  change: { text: string; kind: "up" | "down" | "unchanged"; label: string } | null
  path: string | null // SVG path of the 10-year line in OG_CHART_BOX
  range: string | null // "2016-11 to 2026-11"
  dataLines: string[] // ["ECB reference rate of 2026-11-20"], one fact per line
  source: string // "Source: European Central Bank via Frankfurter API"
  alt: string
  date: string | null // data date, YYYY-MM-DD: the ECB rate date; the metal provider's UTC day
}

const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, "")

export function currencyCard(base: string, target: string, rateLabel: string | null, ecbDate: string | null, tenYear: ChartPeriod | null): OgCard {
  const title = `${NAME[base]} to ${NAME[target]}`
  const d = tenYear?.changePct != null ? directionOf(tenYear.changePct) : null
  const path = tenYear && tenYear.points.length > 1 ? chartGeometry(tenYear.points, OG_CHART_BOX).path : null
  const first = tenYear?.points[0]?.date
  const last = tenYear?.points.at(-1)?.date
  const card: OgCard = {
    eyebrow: "Exchange rate",
    title,
    codes: `${base} / ${target}`,
    figure: rateLabel,
    change: d ? { text: d.text, kind: d.kind, label: `Change in the ${base}/${target} rate over 10 years` } : null,
    path,
    range: first && last ? `${first.slice(0, 7)} to ${last.slice(0, 7)}` : null,
    dataLines: [ecbDate ? `ECB reference rate of ${ecbDate}` : "ECB reference rate"],
    source: "Source: European Central Bank via Frankfurter API",
    alt: `${title} (${base}/${target}): ${rateLabel ?? "exchange rate"}${d ? `, ${d.text} over 10 years` : ""}${ecbDate ? `, ECB reference rate of ${ecbDate}` : ""}. CurrencyVersus`,
    date: ecbDate,
  }
  return asciiCard(card)
}

export function metalCard(metal: string, quote: string, priceLabel: string | null, priceTime: string | null, fxDate: string | null): OgCard {
  const isRatio = quote === "XAG"
  const title = isRatio ? "Gold/silver ratio" : `${METAL[metal]} price in ${NAME[quote]}`
  const time = priceTime ? `${priceTime.slice(0, 10)} ${priceTime.slice(11, 16)} UTC` : null
  const card: OgCard = {
    eyebrow: "Metal price",
    title,
    codes: isRatio ? "XAU / XAG" : `${metal} / ${quote}`,
    figure: priceLabel,
    change: null,
    path: null,
    range: null,
    dataLines: [time ? `Price time ${time} (provider)` : "Spot price", fxDate && quote !== "USD" && !isRatio ? `Converted at the ECB reference rate of ${fxDate}` : null].filter((x): x is string => x !== null),
    source: quote === "USD" || isRatio ? "Source: gold-api.com" : "Sources: gold-api.com, European Central Bank via Frankfurter API",
    alt: `${title}: ${priceLabel ?? "spot price per troy ounce"}${time ? `, provider time ${time}` : ""}. CurrencyVersus`,
    date: priceTime ? priceTime.slice(0, 10) : null,
  }
  return asciiCard(card)
}

// File name the page's download link offers: the page and the image's data
// date, e.g. "usd-vs-try-2026-11-21.png" ("usd-vs-try.png" without a date).
export function shareDownloadName(slug: string, date: string | null): string {
  return date !== null && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${slug}-${date}.png` : `${slug}.png`
}

function asciiCard(c: OgCard): OgCard {
  return {
    ...c,
    title: ascii(c.title),
    figure: c.figure === null ? null : ascii(c.figure),
    dataLines: c.dataLines.map((l) => ascii(l).replace(/ {2,}/g, " ")),
    change: c.change ? { ...c.change, text: ascii(c.change.text) } : null,
  }
}

// ---- Turkish pilot pages (task C3-4) -------------------------------------
// Same layout and rules as the English cards; Turkish text and formats
// (format-tr.ts, pilot-format-tr.ts). Not filtered to ASCII: every character
// must be in the image font instead (glyphs.ts; checked before drawing, the
// build fails on a missing glyph rather than fetching a font).

export function trCurrencyCard(base: string, target: string, rate: number | null, ecbDate: string | null, tenYear: ChartPeriod | null): OgCard {
  const pair = `${trCurrencyName(base)}/${trCurrencyName(target)}`
  const title = `${capitalTr(trCurrencyName(base))} / ${trCurrencyName(target)}`
  const d = tenYear?.changePct != null ? directionOf(tenYear.changePct) : null
  const path = tenYear && tenYear.points.length > 1 ? chartGeometry(tenYear.points, OG_CHART_BOX).path : null
  const first = tenYear?.points[0]?.date
  const last = tenYear?.points.at(-1)?.date
  const figure = rate !== null ? trRateLabel(base, target, rate) : null
  const change = d ? trPercent(d.text) : null
  return {
    eyebrow: "Döviz kuru",
    title,
    codes: `${base} / ${target}`,
    figure,
    change: d ? { text: change!, kind: d.kind, label: `${pair} kurunun 10 yıldaki değişimi` } : null,
    path,
    range: first && last ? `${trMonthYear(first)} – ${trMonthYear(last)}` : null,
    dataLines: [ecbDate ? `ECB referans kuru, ${trDateShort(ecbDate)}` : "ECB referans kuru"],
    source: "Kaynak: Avrupa Merkez Bankası (Frankfurter API üzerinden)",
    alt: `${title} (${base}/${target}): ${figure ?? "döviz kuru"}${change ? `, 10 yılda ${change}` : ""}${ecbDate ? `, ECB referans kuru ${trDateShort(ecbDate)}` : ""}. CurrencyVersus`,
    date: ecbDate,
  }
}

// Gram gold in TL, ounce gold in USD: figure as the page's converter shows it.
export function trGoldCard(kind: "gram" | "ons", figure: string | null, priceTime: string | null, fxDate: string | null): OgCard {
  const title = kind === "gram" ? "Gram altın" : "Ons altın"
  const time = trUtcTime(priceTime)
  return {
    eyebrow: kind === "gram" ? "Altın fiyatı (TL)" : "Altın fiyatı (dolar)",
    title,
    codes: kind === "gram" ? "XAU / TRY" : "XAU / USD",
    figure,
    change: null,
    path: null,
    range: null,
    dataLines: [time ? `Fiyat zamanı ${time} (sağlayıcı)` : "Spot fiyat", kind === "gram" && fxDate ? `ECB referans kuruyla çevrildi, ${trDateShort(fxDate)}` : null].filter((x): x is string => x !== null),
    source: kind === "gram" ? "Kaynaklar: gold-api.com, Avrupa Merkez Bankası" : "Kaynak: gold-api.com",
    alt: `${title}: ${figure ?? "spot fiyat"}${time ? `, sağlayıcı zamanı ${time}` : ""}. Spot fiyattan teorik değer, kuyumcu fiyatı değildir. CurrencyVersus`,
    date: priceTime ? priceTime.slice(0, 10) : null,
  }
}

// The Turkish home: the pages it lists, no figure.
export function trHomeCard(): OgCard {
  return {
    eyebrow: "Türkçe",
    title: "Dolar, euro ve altın",
    codes: "Dolar/TL · Euro/TL · Gram altın · Ons altın",
    figure: null,
    change: null,
    path: null,
    range: null,
    dataLines: ["Banka ya da kuyumcu fiyatı değildir"],
    source: "Kaynaklar: Avrupa Merkez Bankası, gold-api.com",
    alt: "Dolar/TL, Euro/TL, gram altın ve ons altın: Türkçe referans kur ve spot fiyat sayfaları. CurrencyVersus",
    date: null,
  }
}

// The method page: no figure, what the page is about.
export function trMethodCard(): OgCard {
  return {
    eyebrow: "Yöntem",
    title: "Kurlar ve fiyatlar nereden geliyor?",
    codes: "ECB referans kurları · gold-api.com spot fiyatları",
    figure: null,
    change: null,
    path: null,
    range: null,
    dataLines: ["Çapraz kur, troy ons, tarihsel veri, hata bildirimi"],
    source: "Banka kuru ve kuyumcu fiyatı neden farklı?",
    alt: "Yöntem: CurrencyVersus'taki kurlar ve altın fiyatları nereden geliyor ve nasıl hesaplanıyor. CurrencyVersus",
    date: null,
  }
}

const capitalTr = (s: string) => s.replace(/^./, (c) => c.toLocaleUpperCase("tr"))
