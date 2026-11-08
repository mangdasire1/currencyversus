import { getBuildTimeMetalPrice, getInitialRateData, getBuildTimeHistory } from "@/lib/build-data"
import { HomeClient } from "./HomeClient"

// The default pair the home page opens with. Its rate and history are fetched
// at build time and embedded in the HTML, like on the pair pages, so the first
// view never depends on the API answering in the browser.
const DEFAULT_BASE = "USD"
const DEFAULT_TARGET = "EUR"

export default async function Page() {
  const [goldData, silverData, platinumData, palladiumData, rateData, history] = await Promise.all([
    getBuildTimeMetalPrice("XAU"),
    getBuildTimeMetalPrice("XAG"),
    getBuildTimeMetalPrice("XPT"),
    getBuildTimeMetalPrice("XPD"),
    getInitialRateData(DEFAULT_BASE, DEFAULT_TARGET),
    getBuildTimeHistory(DEFAULT_BASE, DEFAULT_TARGET),
  ])
  if (rateData === null) console.warn(`[home] No build-time rate for ${DEFAULT_BASE}/${DEFAULT_TARGET} — rendering without initial data`)

  return (
    <HomeClient
      initialGoldUsd={goldData?.price ?? null}
      initialSilverUsd={silverData?.price ?? null}
      initialPlatinumUsd={platinumData?.price ?? null}
      initialPalladiumUsd={palladiumData?.price ?? null}
      defaultBase={DEFAULT_BASE}
      defaultTarget={DEFAULT_TARGET}
      initialRate={rateData?.rate ?? null}
      initialDate={rateData?.date ?? null}
      initialHistory={history}
    />
  )
}
