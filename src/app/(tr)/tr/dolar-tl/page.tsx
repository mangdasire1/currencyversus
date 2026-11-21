import type { Metadata } from "next"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { TrFxPage } from "@/components/tr/TrFxPage"
import { trPageMetadata } from "@/lib/tr-metadata"
import { getInitialRateData, getBuildTimeChart } from "@/lib/build-data"
import { PV } from "@/components/pilot/palette"

// Turkish pilot page (task C3): Dolar/TL. Same data as /usd-vs-try/ — the
// build-time ECB rate and the 7-period chart are in the static HTML.
const PATH = "/tr/dolar-tl/"
const TITLE = "Dolar kaç TL? Dolar/TL ECB referans kuru | CurrencyVersus"
const DESCRIPTION = "1 doların kaç TL ettiği, Avrupa Merkez Bankası'nın (ECB) günlük referans kuruyla; 1 aydan 10 yıla grafik ve iki tarih karşılaştırması. Canlı piyasa kuru ya da banka kuru değildir."

// title, description, canonical + hreflang, and the page's Turkish share image
export async function generateMetadata(): Promise<Metadata> {
  return trPageMetadata(PATH, TITLE, DESCRIPTION)
}

export default async function Page() {
  const [rate, chart] = await Promise.all([getInitialRateData("USD", "TRY"), getBuildTimeChart("USD", "TRY")])
  if (rate === null) console.warn("[tr/dolar-tl] No build-time rate — rendering without initial data")
  return (
    <TrPageShell path={PATH} title="Dolar / TL referans kuru">
      <p className="text-[15px] leading-relaxed -mt-4" style={{ color: PV.dim }}>
        1 doların kaç TL ettiği, Avrupa Merkez Bankası&apos;nın günlük referans kuruyla.
      </p>
      <TrFxPage
        path={PATH}
        base="USD"
        target="TRY"
        initialRate={rate?.rate ?? null}
        initialDate={rate?.date ?? null}
        chart={chart}
        builtAt={new Date().toISOString()}
      />
    </TrPageShell>
  )
}
