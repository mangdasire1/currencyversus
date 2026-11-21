import type { Metadata } from "next"
import Link from "next/link"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { TrGoldPage } from "@/components/tr/TrGoldPage"
import { alternatesFor } from "@/lib/tr-pages"
import { getBuildTimeMetalPrice, getInitialRateData } from "@/lib/build-data"
import { GRAMS_PER_TROY_OUNCE } from "@/lib/metal-units"
import { trNumber } from "@/lib/format-tr"
import { PV } from "@/components/pilot/palette"

// Turkish pilot page (task C3). Same data as /gold-vs-usd/: gold-api.com spot price
// per troy ounce in USD; build-time price in the static HTML.
const PATH = "/tr/ons-altin/"
const TITLE = "Ons altın kaç dolar? Troy ons spot fiyatı | CurrencyVersus"
const DESCRIPTION = "Altının troy ons başına dolar cinsinden spot fiyatı, gold-api.com'dan. Gram altının TL karşılığı için ayrı sayfa."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: alternatesFor(PATH),
  openGraph: { title: TITLE, description: DESCRIPTION, url: `https://currencyversus.com${PATH}` },
}

// 31.1034768 → "31,1035" (the method page gives the exact definition)
const OUNCE_G = trNumber(GRAMS_PER_TROY_OUNCE.toFixed(4))

export default async function Page() {
  const gold = await getBuildTimeMetalPrice("XAU")
  if (gold === null) console.warn("[tr/ons-altin] No build-time gold price")
  return (
    <TrPageShell path={PATH} title="Ons altın: troy ons başına dolar fiyatı">
      <p className="text-[15px] leading-relaxed -mt-4" style={{ color: PV.dim }}>
        Türkiye&apos;de &ldquo;ons altın&rdquo; denince altının troy ons başına <strong style={{ color: PV.text }}>dolar</strong>{" "}
        cinsinden fiyatı kastedilir. 1 troy ons = {OUNCE_G} gram.
      </p>
      <TrGoldPage
        target="USD"
        initialOzPriceUsd={gold?.price ?? null}
        initialPriceTime={gold?.priceTime ?? null}
        initialUsdToTargetRate={null}
        initialFxDate={null}
        initialUnit="ozt"
        resultNote={
          <p className="rounded-xl p-3 text-sm leading-relaxed" style={{ color: PV.text, background: PV.raised, border: `1px solid ${PV.border}` }}>
            Spot fiyattır: saf altının ons başına teorik değeri. Bir kuyumcunun ya da bankanın alış/satış fiyatı değildir.
          </p>
        }
      />
      <p className="text-[15px] leading-relaxed" style={{ color: PV.dim }}>
        Aynı fiyatın gram başına TL karşılığı:{" "}
        <Link href="/tr/gram-altin/" className="underline underline-offset-4" style={{ color: PV.accentText }}>
          gram altın kaç TL
        </Link>
        .
      </p>
    </TrPageShell>
  )
}
