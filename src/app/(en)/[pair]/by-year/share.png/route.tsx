import { yearlySlugs, yearlyPairBySlug } from "@/lib/by-year"
import { yearlyShareImage } from "@/lib/share-image"

// /<pair>/by-year/share.png — the by-year page's own share image, written to
// out/ at build time (static export: GET only, force-static).
export const dynamic = "force-static"
export const dynamicParams = false

export async function generateStaticParams() {
  return yearlySlugs().map((pair) => ({ pair }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params
  const p = yearlyPairBySlug(pair)
  if (!p) throw new Error(`no by-year page for ${pair}`)
  return yearlyShareImage(p.base, p.target, "en")
}
