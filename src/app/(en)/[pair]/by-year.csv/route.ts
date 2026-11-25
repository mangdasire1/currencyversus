import { yearlySlugs, yearlyPairBySlug, yearlyCsv } from "@/lib/by-year"
import { getBuildTimeYearly } from "@/lib/build-data"

// /<pair>/by-year.csv — the by-year table as a static CSV file (task C2), the
// same rows and figures as the page (by-year.ts). Linked from the English and
// the Turkish page. Not in the sitemap.
export const dynamic = "force-static"
export const dynamicParams = false

export async function generateStaticParams() {
  return yearlySlugs().map((pair) => ({ pair }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params
  const p = yearlyPairBySlug(pair)
  if (!p) throw new Error(`no by-year CSV for ${pair}`)
  const rows = await getBuildTimeYearly(p.base, p.target)
  return new Response(yearlyCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8" } })
}
