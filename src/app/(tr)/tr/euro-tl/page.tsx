import type { Metadata } from "next"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { TrFxPage } from "@/components/tr/TrFxPage"
import { alternatesFor } from "@/lib/tr-pages"
import { getInitialRateData, getBuildTimeChart } from "@/lib/build-data"
import { PV } from "@/components/pilot/palette"

// Turkish pilot page (task C3): Euro/TL. Same data as /eur-vs-try/ — the
// build-time ECB rate and the 7-period chart are in the static HTML.
const PATH = "/tr/euro-tl/"
const TITLE = "Euro kaç TL? Euro/TL ECB referans kuru | CurrencyVersus"
const DESCRIPTION = "1 euronun kaç TL ettiği, Avrupa Merkez Bankası'nın (ECB) günlük referans kuruyla; 1 aydan 10 yıla grafik ve iki tarih karşılaştırması. Canlı piyasa kuru ya da banka kuru değildir."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: alternatesFor(PATH),
  openGraph: { title: TITLE, description: DESCRIPTION, url: `https://currencyversus.com${PATH}` },
}

export default async function Page() {
  const [rate, chart] = await Promise.all([getInitialRateData("EUR", "TRY"), getBuildTimeChart("EUR", "TRY")])
  if (rate === null) console.warn("[tr/euro-tl] No build-time rate — rendering without initial data")
  return (
    <TrPageShell path={PATH} title="Euro / TL referans kuru">
      <p className="text-[15px] leading-relaxed -mt-4" style={{ color: PV.dim }}>
        1 euronun kaç TL ettiği, Avrupa Merkez Bankası&apos;nın günlük referans kuruyla.
      </p>
      <TrFxPage
        path={PATH}
        base="EUR"
        target="TRY"
        initialRate={rate?.rate ?? null}
        initialDate={rate?.date ?? null}
        chart={chart}
        builtAt={new Date().toISOString()}
      />
    </TrPageShell>
  )
}
