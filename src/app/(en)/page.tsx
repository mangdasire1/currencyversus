import { getBuildTimeMetalPrice, getInitialRateData, getBuildTimeHistory, getBuildTimeChart } from "@/lib/build-data"
import { HomeClient } from "./HomeClient"
import { alternatesFor } from "@/lib/tr-pages"
import type { Metadata } from "next"

// hreflang en/tr/x-default with the Turkish home (/tr/). Here, not in
// SITE_METADATA: that one also reaches the 404 and any page without its own
// alternates. The canonical is the one the layout gives.
export const metadata: Metadata = { alternates: alternatesFor("/") }

// The default pair the home page opens with. Its rate and history are fetched
// at build time and embedded in the HTML, like on the pair pages, so the first
// view never depends on the API answering in the browser.
const DEFAULT_BASE = "USD"
const DEFAULT_TARGET = "EUR"

export default async function Page() {
  const [goldData, silverData, platinumData, palladiumData, rateData, history, chart] = await Promise.all([
    getBuildTimeMetalPrice("XAU"),
    getBuildTimeMetalPrice("XAG"),
    getBuildTimeMetalPrice("XPT"),
    getBuildTimeMetalPrice("XPD"),
    getInitialRateData(DEFAULT_BASE, DEFAULT_TARGET),
    getBuildTimeHistory(DEFAULT_BASE, DEFAULT_TARGET),
    getBuildTimeChart(DEFAULT_BASE, DEFAULT_TARGET),
  ])
  if (rateData === null) console.warn(`[home] No build-time rate for ${DEFAULT_BASE}/${DEFAULT_TARGET} — rendering without initial data`)

  return (
    <HomeClient
      initialGoldUsd={goldData?.price ?? null}
      initialSilverUsd={silverData?.price ?? null}
      initialPlatinumUsd={platinumData?.price ?? null}
      initialPalladiumUsd={palladiumData?.price ?? null}
      initialMetalTimes={{
        XAU: goldData?.priceTime ?? null,
        XAG: silverData?.priceTime ?? null,
        XPT: platinumData?.priceTime ?? null,
        XPD: palladiumData?.priceTime ?? null,
      }}
      defaultBase={DEFAULT_BASE}
      defaultTarget={DEFAULT_TARGET}
      initialRate={rateData?.rate ?? null}
      initialDate={rateData?.date ?? null}
      initialHistory={history}
      initialChart={chart}
    />
  )
}
