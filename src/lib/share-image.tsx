import fs from "node:fs"
import path from "node:path"
import { ImageResponse } from "next/og"
import { parsePairSlug } from "@/lib/routes"
import { getInitialRateData, getBuildTimeChart, getBuildTimeMetalPrice } from "@/lib/build-data"
import { computeConversion, isMetalCode } from "@/lib/conversion"
import { pairSignificantDigits } from "@/lib/ecb"
import { formatFxRate } from "@/lib/format"
import { currencyCard, metalCard, trCurrencyCard, trGoldCard, trMethodCard, OG_SIZE, OG_CHART_BOX } from "@/lib/og-card"
import { cmapCodePoints, missingGlyphs } from "@/lib/glyphs"
import { formatSignificant } from "@/lib/metal-units"
import { trMoney } from "@/lib/format-tr"
import type { OgCard } from "@/lib/og-card"
import type { MetalCode } from "@/lib/metals"
import { PV } from "@/components/pilot/palette"

// Per-page share image (package B6), drawn at build time. Content rules:
// src/lib/og-card.ts. Served as /<page>/share.png (share.png/route.tsx) and
// named in each page's og:image and twitter:image (page.tsx).

export async function cardFor(slug: string): Promise<OgCard | null> {
  const p = parsePairSlug(slug)
  if (!p) return null
  const { base, target } = p
  if (!isMetalCode(base)) {
    const [rate, chart] = await Promise.all([getInitialRateData(base, target), getBuildTimeChart(base, target)])
    const label = rate ? `1 ${base} = ${formatFxRate(rate.rate, pairSignificantDigits(base, target))} ${target}` : null
    return currencyCard(base, target, label, rate?.date ?? null, chart?.find((c) => c.key === "10y") ?? null)
  }
  if (isMetalCode(target)) {
    const [gold, silver] = await Promise.all([getBuildTimeMetalPrice("XAU"), getBuildTimeMetalPrice("XAG")])
    const conv = gold && silver
      ? computeConversion({ base: "XAU", quote: "XAG", amount: 1, metalUnit: "oz", fx: null, metals: { XAU: { metal: "XAU", usdPerOz: gold.price, priceTime: gold.priceTime, fetchedAt: null, stale: false, staleAgeMs: null }, XAG: { metal: "XAG", usdPerOz: silver.price, priceTime: silver.priceTime, fetchedAt: null, stale: false, staleAgeMs: null } }, fxLoading: false, metalLoading: false })
      : null
    return metalCard("XAU", "XAG", conv?.rate != null ? conv.rateLabel : null, gold?.priceTime ?? null, null)
  }
  const [metal, fx] = await Promise.all([getBuildTimeMetalPrice(base as MetalCode), target === "USD" ? Promise.resolve(null) : getInitialRateData("USD", target)])
  const conv = metal
    ? computeConversion({
        base,
        quote: target,
        amount: 1,
        metalUnit: "oz",
        fx: fx ? { base: "USD", quote: target, rate: fx.rate, date: fx.date, fetchedAt: null, stale: false, staleAgeMs: null } : null,
        metals: { [base]: { metal: base, usdPerOz: metal.price, priceTime: metal.priceTime, fetchedAt: null, stale: false, staleAgeMs: null } },
        fxLoading: false,
        metalLoading: false,
      })
    : null
  return metalCard(base, target, conv?.rate != null ? conv.rateLabel.replace(/^1 oz /, "1 troy oz ") : null, metal?.priceTime ?? null, fx?.date ?? null)
}

function Arrow({ kind }: { kind: "up" | "down" }) {
  const d = kind === "up" ? "M0,14 L8,0 L16,14 Z" : "M0,0 L16,0 L8,14 Z"
  const fill = kind === "up" ? PV.up : PV.down
  return <img width={22} height={20} src={`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 14"><path d="${d}" fill="${fill}"/></svg>`)}`} alt="" />
}

export async function shareImage(pair: string): Promise<ImageResponse> {
  const card = await cardFor(pair)
  if (!card) throw new Error(`no share image for ${pair}`)
  return drawCard(card, pair)
}

// Turkish pilot pages (task C3-4): /tr/<page>/share.png, the same data as the
// page (build-time ECB rate and chart; gold-api.com price).
export async function trCardFor(trPath: string): Promise<OgCard> {
  if (trPath === "/tr/yontem/") return trMethodCard()
  if (trPath === "/tr/dolar-tl/" || trPath === "/tr/euro-tl/") {
    const base = trPath === "/tr/dolar-tl/" ? "USD" : "EUR"
    const [rate, chart] = await Promise.all([getInitialRateData(base, "TRY"), getBuildTimeChart(base, "TRY")])
    return trCurrencyCard(base, "TRY", rate?.rate ?? null, rate?.date ?? null, chart?.find((c) => c.key === "10y") ?? null)
  }
  if (trPath === "/tr/gram-altin/" || trPath === "/tr/ons-altin/") {
    const gram = trPath === "/tr/gram-altin/"
    const [metal, fx] = await Promise.all([getBuildTimeMetalPrice("XAU"), gram ? getInitialRateData("USD", "TRY") : Promise.resolve(null)])
    const conv = metal
      ? computeConversion({
          base: "XAU",
          quote: gram ? "TRY" : "USD",
          amount: 1,
          metalUnit: gram ? "g" : "oz",
          fx: fx ? { base: "USD", quote: "TRY", rate: fx.rate, date: fx.date, fetchedAt: null, stale: false, staleAgeMs: null } : null,
          metals: { XAU: { metal: "XAU", usdPerOz: metal.price, priceTime: metal.priceTime, fetchedAt: null, stale: false, staleAgeMs: null } },
          fxLoading: false,
          metalLoading: false,
        })
      : null
    // the figure as the page's converter shows it: "1 gram altın = 5.754,2 TL"
    const value = conv?.rate != null && conv.significant != null ? formatSignificant(conv.rate, conv.significant) : null
    const figure = value === null ? null : gram ? `1 gram altın = ${trMoney(value, "TRY")}` : `1 troy ons altın = ${trMoney(value, "USD")}`
    return trGoldCard(gram ? "gram" : "ons", figure, metal?.priceTime ?? null, fx?.date ?? null)
  }
  throw new Error(`no Turkish share image for ${trPath}`)
}

export async function trShareImage(trPath: string): Promise<ImageResponse> {
  return drawCard(await trCardFor(trPath), trPath)
}

// next/og's built-in font (see glyphs.ts): the characters it can draw.
let imageFont: Set<number> | null = null
function imageFontCoverage(): Set<number> {
  imageFont ??= cmapCodePoints(fs.readFileSync(path.join(process.cwd(), "node_modules", "next", "dist", "compiled", "@vercel", "og", "Geist-Regular.ttf")))
  return imageFont
}

function drawCard(card: OgCard, page: string): ImageResponse {
  // every character must be in the font: a missing one fails the build here
  // instead of making the renderer download a font
  const text = [card.eyebrow, card.title, card.codes, card.figure, card.range, card.change?.label, card.change?.text, ...card.dataLines, card.source, "CurrencyVersus"].filter(Boolean).join(" ")
  const missing = missingGlyphs(text, imageFontCoverage())
  if (missing.length) throw new Error(`share image for ${page}: the image font has no glyph for ${missing.map((c) => `"${c}" U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`).join(", ")}`)
  const line = card.path
    ? `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OG_CHART_BOX.width} ${OG_CHART_BOX.height}" width="${OG_CHART_BOX.width}" height="${OG_CHART_BOX.height}"><path d="${card.path}" fill="none" stroke="${PV.accentText}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/></svg>`
      )}`
    : null
  const changeColor = card.change?.kind === "up" ? PV.up : card.change?.kind === "down" ? PV.down : PV.dim

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PV.bg, color: PV.text, padding: "56px 80px" }}>
        <div style={{ display: "flex", fontSize: 26, color: PV.dim }}>{card.eyebrow}</div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>{card.title}</div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 14 }}>
          <div style={{ display: "flex", fontSize: 30, color: PV.dim }}>{card.codes}</div>
          {line && card.figure && <div style={{ display: "flex", fontSize: 30, marginLeft: 28 }}>{card.figure}</div>}
        </div>
        {line ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, padding: 20, background: PV.surface, border: `2px solid ${PV.border}`, borderRadius: 16 }}>
            <img src={line} width={OG_CHART_BOX.width - 40} height={OG_CHART_BOX.height - 70} alt="" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 24, color: PV.dim }}>
              <div style={{ display: "flex" }}>{card.range}</div>
              {card.change && (
                <div style={{ display: "flex", alignItems: "center", color: changeColor }}>
                  <div style={{ display: "flex", marginRight: 14, color: PV.dim }}>{card.change.label}:</div>
                  {card.change.kind !== "unchanged" && <Arrow kind={card.change.kind} />}
                  <div style={{ display: "flex", marginLeft: 8, fontWeight: 700 }}>{card.change.text}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // metal pages: no history, the price is the card's figure
          <div style={{ display: "flex", marginTop: 56, fontSize: 64, fontWeight: 700 }}>{card.figure ?? ""}</div>
        )}
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 24, color: PV.dim }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            {card.dataLines.map((l) => (
              <div key={l} style={{ display: "flex", marginTop: 4 }}>{l}</div>
            ))}
            <div style={{ display: "flex", marginTop: 4 }}>{card.source}</div>
          </div>
          <div style={{ display: "flex", flexShrink: 0, fontSize: 34, fontWeight: 700, color: PV.text }}>
            Currency<span style={{ color: PV.accentText }}>Versus</span>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  )
}
