// By-year pages (task C2): six pairs in English, two of them also in Turkish.
// Pure — tested in by-year.test.ts.
//
// One module feeds the page, its table, its CSV, its share image, its
// breadcrumbs and the links to it, so a figure on the page and in the CSV
// cannot differ: both are the same strings from yearCells().

import { CURRENCIES } from "./currencies.ts"
import { rateDecimals, significantDecimals } from "./format.ts"
import { roundsToZeroPercent } from "./chart.ts"
import { pairCrumbs } from "./breadcrumbs.ts"
import type { Crumb } from "./breadcrumbs.ts"
import { yearLabelEn, yearLabelTr, trAblative } from "./yearly.ts"
import type { YearRow } from "./yearly.ts"

export interface YearlyPair {
  base: string
  target: string
  tr: { path: string; pairPath: string; name: string } | null // Turkish page, its pair page, "dolar/TL"
}

export const YEARLY_PAIRS: readonly YearlyPair[] = [
  { base: "USD", target: "TRY", tr: { path: "/tr/dolar-tl/yillara-gore/", pairPath: "/tr/dolar-tl/", name: "dolar/TL" } },
  { base: "EUR", target: "TRY", tr: { path: "/tr/euro-tl/yillara-gore/", pairPath: "/tr/euro-tl/", name: "euro/TL" } },
  { base: "USD", target: "EUR", tr: null },
  { base: "EUR", target: "GBP", tr: null },
  { base: "EUR", target: "CHF", tr: null },
  { base: "USD", target: "JPY", tr: null },
]

const slug = (base: string, target: string) => `${base.toLowerCase()}-vs-${target.toLowerCase()}`

// "/usd-vs-try/by-year/"
export function yearlyPath(base: string, target: string): string {
  return `/${slug(base, target)}/by-year/`
}
// "/usd-vs-try/by-year.csv" — one file per pair, linked from both languages
export function yearlyCsvPath(base: string, target: string): string {
  return `/${slug(base, target)}/by-year.csv`
}
export function yearlyPair(base: string, target: string): YearlyPair | null {
  return YEARLY_PAIRS.find((p) => p.base === base && p.target === target) ?? null
}
export function yearlyPairBySlug(s: string): YearlyPair | null {
  return YEARLY_PAIRS.find((p) => slug(p.base, p.target) === s) ?? null
}
export function yearlyPairByTrPath(path: string): YearlyPair | null {
  return YEARLY_PAIRS.find((p) => p.tr?.path === path) ?? null
}
export const yearlySlugs = () => YEARLY_PAIRS.map((p) => slug(p.base, p.target))

const NAME: Record<string, string> = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.name]))

// Range of years in titles: "2005–2026"
export function yearSpan(rows: readonly Pick<YearRow, "year">[]): string {
  return `${rows[0].year}–${rows[rows.length - 1].year}`
}

export function yearlyTitleEn(base: string, target: string, rows: readonly YearRow[]): string {
  return `${base} to ${target} by year (${yearSpan(rows)}): year-end, average, high and low`
}
export function yearlyH1En(base: string, target: string): string {
  return `${NAME[base]} to ${NAME[target]} by year`
}
export function yearlyDescriptionEn(base: string, target: string, rows: readonly YearRow[]): string {
  return `${base}/${target} for every year from ${yearSpan(rows).replace("–", " to ")}, from the European Central Bank's daily reference rates: year-end rate, yearly average, low and high with their dates, and the change from the previous year-end. Also as a CSV file.`
}

// Turkish: the question people ask, then the subject
const TR_QUESTION: Record<string, string> = { USD: "Dolar kaç TL'ydi?", EUR: "Euro kaç TL'ydi?" }
export function yearlyTitleTr(p: YearlyPair, rows: readonly YearRow[]): string {
  return `${TR_QUESTION[p.base]} Yıllara göre ${p.tr!.name} (${yearSpan(rows)})`
}
export function yearlyH1Tr(p: YearlyPair): string {
  return `Yıllara göre ${p.tr!.name}`
}
export function yearlyDescriptionTr(p: YearlyPair, rows: readonly YearRow[]): string {
  return `${rows[0].year}'${trAblative(rows[0].year)} bu yana her yıl için ${p.tr!.name}, Avrupa Merkez Bankası'nın günlük referans kurlarından: yıl sonu kuru, yıl ortalaması, en düşük ve en yüksek kur tarihleriyle, önceki yıl sonuna göre değişim. CSV dosyası olarak da indirilebilir. TCMB kuru değildir.`
}
// Home › Currencies › USD to TRY › By year
export function yearlyCrumbsEn(base: string, target: string): Crumb[] {
  return [...pairCrumbs(base, target), { name: "By year", path: yearlyPath(base, target) }]
}
// Ana sayfa › Dolar/TL › Yıllara göre
export function yearlyCrumbsTr(p: YearlyPair): Crumb[] {
  const name = p.tr!.name.replace(/^./, (c) => c.toLocaleUpperCase("tr"))
  return [{ name: "Ana sayfa", path: "/tr/" }, { name, path: p.tr!.pairPath }, { name: "Yıllara göre", path: p.tr!.path }]
}

// ---------------------------------------------------------------------------
// Figures as shown. The rounding rule of the pair pages: no more significant
// digits than the ECB data carries for that year (row.sig), and no more
// decimals than the site's rate format. Machine form: dot decimal, no
// thousands separator — the table shows it with the page's separators
// (English: as is, since no yearly rate reaches 1,000; Turkish: comma decimal).

export function rateText(n: number, sig: number): string {
  return n.toFixed(Math.min(rateDecimals(n), significantDecimals(n, sig)))
}

// Change in percent, two decimals; "0.00" when it rounds to zero (no sign, no arrow)
export function changeText(p: number | null): string {
  if (p === null) return ""
  return roundsToZeroPercent(p) ? "0.00" : p.toFixed(2)
}

export type Coverage = "full" | "year_to_date" | "partial_start"
export interface YearCells {
  year: number
  coverage: Coverage
  first: string // first publication day counted
  end: string // year-end rate
  endDate: string
  average: string
  low: string
  lowDate: string
  high: string
  highDate: string
  change: string // "" in the first year
  changePct: number | null // raw, for the arrow and its colour
  days: number
}

export function yearCells(r: YearRow): YearCells {
  return {
    year: r.year,
    coverage: r.current ? "year_to_date" : r.partialStart ? "partial_start" : "full",
    first: r.first,
    end: rateText(r.end.rate, r.end.sig),
    endDate: r.end.date,
    average: rateText(r.average, r.sig),
    low: rateText(r.low.rate, r.low.sig),
    lowDate: r.low.date,
    high: rateText(r.high.rate, r.high.sig),
    highDate: r.high.date,
    change: changeText(r.changePct),
    changePct: r.changePct,
    days: r.days,
  }
}

// Newest year first, as on the page
export const newestFirst = (rows: readonly YearRow[]) => [...rows].sort((a, b) => b.year - a.year)

export const CSV_COLUMNS = [
  "year", "coverage", "first_day", "year_end_date", "year_end_rate", "average", "low", "low_date", "high", "high_date",
  "change_from_previous_year_end_pct", "publication_days",
] as const

// The page's table as CSV: header row, then the same rows in the same order
// with the same figures. Dot decimal, no thousands separator, ISO dates.
export function yearlyCsv(rows: readonly YearRow[]): string {
  const lines = [CSV_COLUMNS.join(",")]
  for (const c of newestFirst(rows).map(yearCells)) {
    lines.push([c.year, c.coverage, c.first, c.endDate, c.end, c.average, c.low, c.lowDate, c.high, c.highDate, c.change, c.days].join(","))
  }
  return lines.join("\n") + "\n"
}

export const yearLabel = (r: YearRow, lang: "en" | "tr") => (lang === "tr" ? yearLabelTr(r) : yearLabelEn(r))

// Points of the chart: one per year, its year-end rate (the latest for the current year)
export function yearEndPoints(rows: readonly YearRow[]): { date: string; rate: number }[] {
  return rows.map((r) => ({ date: r.end.date, rate: r.end.rate }))
}
