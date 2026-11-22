"use client"

import Link from "next/link"
import { useConversion, useConversionInputs } from "@/hooks/useConversion"
import { computeConversion } from "@/lib/conversion"
import { formatSignificant, valueOfWeight } from "@/lib/metal-units"
import type { WeightUnit } from "@/lib/metal-units"
import { trMoney, trDateShort, trUtcTime } from "@/lib/format-tr"
import { trRateLabel } from "@/lib/pilot-format-tr"
import type { ExchangeRate } from "@/lib/types"
import { PV, MONO } from "@/components/pilot/palette"
import { TrStaleNote } from "./TrStaleNote"

interface TrHomeListProps {
  usd: { rate: number; date: string } | null // ECB USD→TRY at build time
  eur: { rate: number; date: string } | null // ECB EUR→TRY at build time
  gold: { price: number; priceTime: string | null } | null // USD per troy ounce at build time
}

const seed = (base: string, d: { rate: number; date: string } | null): ExchangeRate | null =>
  d && { base, date: d.date, rates: { TRY: d.rate } }

function Card({ href, name, value }: { href: string; name: string; value: string }) {
  const [unit, amount] = value.split(" = ") // the amount keeps its currency on its line
  return (
    <li className="min-w-0">
      <Link href={href} className="flex flex-col gap-1 min-h-[44px] rounded-xl p-4" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
        <span className="text-sm underline underline-offset-4" style={{ color: PV.dim }}>{name}</span>{" "}
        <span className="text-lg font-semibold break-words" style={{ ...MONO, color: PV.text }}>
          {`${unit} = `}
          <span className="whitespace-nowrap">{amount}</span>
        </span>
      </Link>
    </li>
  )
}

// The values on the Turkish home (/tr/): each is the figure its own page shows,
// from the same hooks and caches (build-time data in the static HTML, then the
// browser's check for newer data), so a list value and its page cannot differ.
export function TrHomeList({ usd, eur, gold }: TrHomeListProps) {
  const usdConv = useConversion("USD", "TRY", { initialFx: seed("USD", usd) })
  const eurConv = useConversion("EUR", "TRY", { initialFx: seed("EUR", eur) })
  const metal = { initialMetalUsd: { XAU: gold?.price ?? null }, initialMetalTime: { XAU: gold?.priceTime ?? null } }
  const inTry = computeConversion({ ...useConversionInputs("XAU", "TRY", { ...metal, initialFx: seed("USD", usd) }), metalUnit: "oz" })
  const inUsd = computeConversion({ ...useConversionInputs("XAU", "USD", metal), metalUnit: "oz" })

  // As on the detail pages' converter: one unit of weight, the source's significant digits.
  const goldValue = (conv: typeof inTry, unit: WeightUnit, code: string) =>
    conv.rate !== null && conv.significant !== null
      ? trMoney(formatSignificant(valueOfWeight(1, unit, conv.rate), conv.significant), code)
      : "—"

  const usdDay = trDateShort(usdConv.fxDate)
  const eurDay = trDateShort(eurConv.fxDate)
  const stale = [usdConv, eurConv, inTry, inUsd].some((c) => c.status === "stale")

  return (
    <>
      <section id="doviz" aria-labelledby="doviz-baslik" className="scroll-mt-4 flex flex-col gap-3">
        <h2 id="doviz-baslik" className="text-lg font-semibold">Döviz</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card href="/tr/dolar-tl/" name="Dolar/TL" value={usdConv.rate !== null ? trRateLabel("USD", "TRY", usdConv.rate) : "—"} />
          <Card href="/tr/euro-tl/" name="Euro/TL" value={eurConv.rate !== null ? trRateLabel("EUR", "TRY", eurConv.rate) : "—"} />
        </ul>
        <p className="text-sm" style={{ color: PV.dim }}>
          {usdDay === eurDay
            ? `ECB referans kuru, ${usdDay ?? "—"}. Canlı piyasa kuru ya da banka kuru değildir.`
            : `ECB referans kuru: dolar ${usdDay ?? "—"}, euro ${eurDay ?? "—"}. Canlı piyasa kuru ya da banka kuru değildir.`}
        </p>
      </section>

      <section id="altin" aria-labelledby="altin-baslik" className="scroll-mt-4 flex flex-col gap-3">
        <h2 id="altin-baslik" className="text-lg font-semibold">Altın</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card href="/tr/gram-altin/" name="Gram altın" value={`1 gram altın = ${goldValue(inTry, "g", "TRY")}`} />
          <Card href="/tr/ons-altin/" name="Ons altın" value={`1 troy ons altın = ${goldValue(inUsd, "ozt", "USD")}`} />
        </ul>
        <p className="text-sm" style={{ color: PV.dim }}>
          Saf altının spot fiyattan teorik değeridir; kuyumcu ya da banka fiyatı değildir. Gram altının TL karşılığı ECB dolar/TL
          referans kuruyla hesaplanır.
        </p>
        <p className="text-xs" style={{ ...MONO, color: PV.faint }}>
          Fiyat zamanı (sağlayıcının bildirdiği): {trUtcTime(inUsd.metalPriceTime) ?? "—"} · Kaynak: gold-api.com
        </p>
      </section>

      {stale && <TrStaleNote />}
    </>
  )
}
