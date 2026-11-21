// Content of the per-page share image (package B6). Pure — tested in
// og-card.test.ts; drawn by src/app/[pair]/opengraph-image.tsx.
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
  }
  return asciiCard(card)
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
