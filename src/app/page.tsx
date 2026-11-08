import { getBuildTimeMetalPrice } from "@/lib/build-data"
import { HomeClient } from "./HomeClient"

export default async function Page() {
  const [goldData, silverData, platinumData, palladiumData] = await Promise.all([
    getBuildTimeMetalPrice("XAU"),
    getBuildTimeMetalPrice("XAG"),
    getBuildTimeMetalPrice("XPT"),
    getBuildTimeMetalPrice("XPD"),
  ])

  return (
    <HomeClient
      initialGoldUsd={goldData?.price ?? null}
      initialSilverUsd={silverData?.price ?? null}
      initialPlatinumUsd={platinumData?.price ?? null}
      initialPalladiumUsd={palladiumData?.price ?? null}
    />
  )
}
