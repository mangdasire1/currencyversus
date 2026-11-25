import type { Metadata } from "next"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { YearlyView } from "./YearlyView"
import { getBuildTimeYearly } from "@/lib/build-data"
import { yearlyPairByTrPath, yearlyTitleTr, yearlyH1Tr, yearlyDescriptionTr } from "@/lib/by-year"
import type { YearlyPair } from "@/lib/by-year"
import { trPageMetadata } from "@/lib/tr-metadata"

// Turkish by-year page (task C2): /tr/dolar-tl/yillara-gore/, /tr/euro-tl/yillara-gore/.
function pairFor(path: string): YearlyPair {
  const p = yearlyPairByTrPath(path)
  if (!p) throw new Error(`not a Turkish by-year page: ${path}`)
  return p
}

export async function trYearlyMetadata(path: string): Promise<Metadata> {
  const p = pairFor(path)
  const rows = await getBuildTimeYearly(p.base, p.target)
  return trPageMetadata(path, yearlyTitleTr(p, rows), yearlyDescriptionTr(p, rows))
}

export async function TrYearlyPage({ path }: { path: string }) {
  const p = pairFor(path)
  const rows = await getBuildTimeYearly(p.base, p.target)
  return (
    <TrPageShell path={path} title={yearlyH1Tr(p)}>
      <YearlyView pair={p} rows={rows} lang="tr" />
    </TrPageShell>
  )
}
