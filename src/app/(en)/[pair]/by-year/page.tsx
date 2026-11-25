import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Header } from "@/components/Header"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { MethodFooterLink } from "@/components/RelatedLinks"
import { YearlyView } from "@/components/yearly/YearlyView"
import { PV, MONO, SANS } from "@/components/pilot/palette"
import { getBuildTimeYearly } from "@/lib/build-data"
import { yearlySlugs, yearlyPairBySlug, yearlyPath, yearlyTitleEn, yearlyH1En, yearlyDescriptionEn, yearlyCrumbsEn } from "@/lib/by-year"
import { alternatesFor, languageLinkFor } from "@/lib/tr-pages"
import { yearlyCardFor } from "@/lib/share-image"
import { OG_SIZE } from "@/lib/og-card"

// By-year pages (task C2): six pairs. Everything on the page comes from the
// full ECB series at build time; a missing series fails the build.
export const dynamicParams = false

export async function generateStaticParams() {
  return yearlySlugs().map((pair) => ({ pair }))
}

export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }): Promise<Metadata> {
  const { pair } = await params
  const p = yearlyPairBySlug(pair)
  if (!p) return { title: "Not Found" }
  const rows = await getBuildTimeYearly(p.base, p.target)
  const path = yearlyPath(p.base, p.target)
  const url = `https://currencyversus.com${path}`
  const title = yearlyTitleEn(p.base, p.target, rows)
  const description = yearlyDescriptionEn(p.base, p.target, rows)
  const card = await yearlyCardFor(p.base, p.target, "en")
  const image = { url: `${url}share.png`, width: OG_SIZE.width, height: OG_SIZE.height, alt: card.alt, type: "image/png" }
  return {
    title,
    description,
    // canonical, plus hreflang en/tr/x-default for the two pairs with a Turkish page
    alternates: alternatesFor(path),
    openGraph: { title, description, url, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  }
}

export default async function ByYearPage({ params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params
  const p = yearlyPairBySlug(pair)
  if (!p) notFound()
  const rows = await getBuildTimeYearly(p.base, p.target)
  return (
    <div className="min-h-screen flex flex-col" style={{ background: PV.bg, color: PV.text, ...SANS }}>
      <Header width="max-w-3xl" current="currencies" languageLink={languageLinkFor(yearlyPath(p.base, p.target))} />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pb-10 flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <Breadcrumbs crumbs={yearlyCrumbsEn(p.base, p.target)} />
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>Exchange rate history</p>
          <h1 className="text-[28px] sm:text-4xl font-bold leading-tight">{yearlyH1En(p.base, p.target)}</h1>
          <p className="text-sm" style={{ ...MONO, color: PV.dim }}>{p.base} / {p.target}</p>
        </div>
        <YearlyView pair={p} rows={rows} lang="en" />
      </main>
      <footer className="text-center py-6 text-xs px-4 flex flex-col items-center" style={{ color: PV.faint }}>
        <span>CurrencyVersus · Data from ECB via Frankfurter API · For information only, not financial advice</span>
        <MethodFooterLink />
      </footer>
    </div>
  )
}
