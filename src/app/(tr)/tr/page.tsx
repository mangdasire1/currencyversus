import type { Metadata } from "next"
import Link from "next/link"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { TrHomeList } from "@/components/tr/TrHomeList"
import { trPageMetadata } from "@/lib/tr-metadata"
import { getBuildTimeMetalPrice, getInitialRateData } from "@/lib/build-data"
import { PV } from "@/components/pilot/palette"

// Turkish home (task C3, fix 1), the pair of /: the five Turkish pages, four
// of them with their current value in the static HTML.
const PATH = "/tr/"
const TITLE = "Dolar, euro, gram altın ve ons altın | CurrencyVersus"
const DESCRIPTION =
  "Dolar/TL ve Euro/TL için ECB referans kuru, gram altın ve ons altın için spot fiyattan değerler. Canlı piyasa, banka ya da kuyumcu fiyatı değildir."

// title, description, canonical + hreflang, and the page's Turkish share image
export async function generateMetadata(): Promise<Metadata> {
  return trPageMetadata(PATH, TITLE, DESCRIPTION)
}

export default async function Page() {
  const [usd, eur, gold] = await Promise.all([
    getInitialRateData("USD", "TRY"),
    getInitialRateData("EUR", "TRY"),
    getBuildTimeMetalPrice("XAU"),
  ])
  if (!usd || !eur || !gold) console.warn("[tr] Build-time data missing — verify-tr fails the build")
  return (
    <TrPageShell path={PATH} title="Dolar, euro ve altın">
      <p className="text-[15px] leading-relaxed -mt-4" style={{ color: PV.dim }}>
        Dolar ve euronun TL karşılığı Avrupa Merkez Bankası&apos;nın günlük referans kuruyla, gram ve ons altın spot fiyatla.
      </p>
      <TrHomeList
        usd={usd && { rate: usd.rate, date: usd.date }}
        eur={eur && { rate: eur.rate, date: eur.date }}
        gold={gold && { price: gold.price, priceTime: gold.priceTime ?? null }}
      />
      <Link href="/tr/yontem/" className="self-start inline-flex items-center min-h-[44px] text-sm underline underline-offset-4" style={{ color: PV.accentText }}>
        Yöntem: rakamlar nereden geliyor, nasıl hesaplanıyor
      </Link>
    </TrPageShell>
  )
}
