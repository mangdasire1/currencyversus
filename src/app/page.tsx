import { getBuildTimeMetalPrice } from "@/lib/build-data"
import { HomeClient } from "./HomeClient"

export default async function Page() {
  const [goldData, silverData] = await Promise.all([
    getBuildTimeMetalPrice("XAU"),
    getBuildTimeMetalPrice("XAG"),
  ])

  return (
    <HomeClient
      initialGoldUsd={goldData?.price ?? null}
      initialSilverUsd={silverData?.price ?? null}
    />
  )
}
