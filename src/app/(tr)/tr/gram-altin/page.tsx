import type { Metadata } from "next"
import Link from "next/link"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { TrGoldPage } from "@/components/tr/TrGoldPage"
import { alternatesFor } from "@/lib/tr-pages"
import { getBuildTimeMetalPrice, getInitialRateData } from "@/lib/build-data"
import { GRAMS_PER_TROY_OUNCE } from "@/lib/metal-units"
import { trNumber } from "@/lib/format-tr"
import { PV } from "@/components/pilot/palette"

// Turkish pilot page (task C3). Same data as /gold-vs-try/: gold-api.com spot price
// per troy ounce in USD, × the ECB USD→TRY rate; build-time price in the static HTML.
const PATH = "/tr/gram-altin/"
const TITLE = "Gram altın kaç TL? Spot fiyattan teorik değer | CurrencyVersus"
const DESCRIPTION = "1 gram saf altının spot fiyattan TL karşılığı: gold-api.com fiyatı, ECB referans kuruyla TL'ye çevrilir. Kuyumcu, banka ya da Kapalıçarşı fiyatı değildir."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: alternatesFor(PATH),
  openGraph: { title: TITLE, description: DESCRIPTION, url: `https://currencyversus.com${PATH}` },
}

// 31.1034768 → "31,1035" (the method page gives the exact definition)
const OUNCE_G = trNumber(GRAMS_PER_TROY_OUNCE.toFixed(4))

export default async function Page() {
  const [gold, usdTry] = await Promise.all([getBuildTimeMetalPrice("XAU"), getInitialRateData("USD", "TRY")])
  if (gold === null) console.warn("[tr/gram-altin] No build-time gold price")
  return (
    <TrPageShell path={PATH} title="Gram altın: spot fiyattan TL değeri">
      <p className="text-[15px] leading-relaxed -mt-4" style={{ color: PV.dim }}>
        1 gram saf altının, altının spot fiyatından hesaplanan TL karşılığı.
      </p>
      <TrGoldPage
        target="TRY"
        initialOzPriceUsd={gold?.price ?? null}
        initialPriceTime={gold?.priceTime ?? null}
        initialUsdToTargetRate={usdTry?.rate ?? null}
        initialFxDate={usdTry?.date ?? null}
        initialUnit="g"
        resultNote={
          <p className="rounded-xl p-3 text-sm leading-relaxed" style={{ color: PV.text, background: PV.raised, border: `1px solid ${PV.border}` }}>
            Bu rakam, 1 gram saf altının spot fiyattan <strong>teorik değeridir</strong>. Kuyumcudaki gram altın, bankadaki
            altın hesabı ve Kapalıçarşı fiyatları buna alış/satış farkı ekler; kuyumcu ürünlerinde işçilik ve uygulandığı
            yerde vergi de eklenir. Aradaki fark doğaldır; bu sayfa o fiyatları göstermez.
          </p>
        }
      />
      <section aria-labelledby="kapsam" className="flex flex-col gap-2 text-[15px] leading-relaxed" style={{ color: PV.dim }}>
        <h2 id="kapsam" className="text-lg font-semibold" style={{ color: PV.text }}>Çeyrek, Cumhuriyet altını ve ayarlar neden yok?</h2>
        <p>
          22 ayar, 14 ayar, çeyrek, yarım, tam, Cumhuriyet altını ve bilezik için rakam verilmez. Bunların değeri ayara
          (içindeki saf altın oranına) ve işçiliğe göre değişir; tek bir doğru değerleri yoktur.
        </p>
        <p>
          Altının troy ons başına dolar fiyatı için{" "}
          <Link href="/tr/ons-altin/" className="underline underline-offset-4" style={{ color: PV.accentText }}>
            ons altın sayfası
          </Link>
          . 1 troy ons = {OUNCE_G} gram.
        </p>
      </section>
    </TrPageShell>
  )
}
