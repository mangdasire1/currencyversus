import { notFound } from "next/navigation"
import { cardFor } from "@/lib/share-image"
import { OG_SIZE, shareDownloadName } from "@/lib/og-card"
import type { ShareImageDownload } from "@/components/ShareImageLink"
import { CURRENCIES } from "@/lib/currencies"
import { getInitialRateData, getBuildTimeMetalPrice, getBuildTimeHistory, getBuildTimeChart } from "@/lib/build-data"
import { getFAQSchema } from "@/lib/structured-data"
import { routeCatalog, METAL_SLUGS, isValidPairRoute, codeToSlug } from "@/lib/routes"
import { METALS } from "@/lib/metals"
import { PilotPairPageClient } from "./PilotPairPageClient"
import { MetalPageClient } from "./MetalPageClient"
import { MetalRatioPageClient } from "./MetalRatioPageClient"
import type { MetalCode } from "@/lib/metals"

const CODES = CURRENCIES.map((c) => c.code)

// URL slug → metal code, from the route catalog's slugs (gold, silver,
// platinum, palladium)
const METAL_URL: Record<string, MetalCode> = Object.fromEntries(
  Object.entries(METAL_SLUGS).map(([code, slug]) => [slug, code as MetalCode])
)

function metalName(code: MetalCode): string {
  return METALS.find((m) => m.code === code)?.name ?? code
}

function parsePair(pair: string): { base: string; target: string } | null {
  const parts = pair.split("-vs-")
  if (parts.length !== 2) return null
  const base = parts[0].toUpperCase()
  const target = parts[1].toUpperCase()
  if (!CODES.includes(base) || !CODES.includes(target) || base === target) return null
  return { base, target }
}

type MetalPair =
  | { type: "metal-currency"; metal: MetalCode; target: string }
  | { type: "ratio"; metal1: MetalCode; metal2: MetalCode }

function parseMetalPair(pair: string): MetalPair | null {
  const parts = pair.split("-vs-")
  if (parts.length !== 2) return null
  const [left, right] = parts
  const leftMetal = METAL_URL[left]
  const rightMetal = METAL_URL[right]

  if (leftMetal && rightMetal) {
    return { type: "ratio", metal1: leftMetal, metal2: rightMetal }
  }
  if (leftMetal) {
    const target = right.toUpperCase()
    // Platinum and palladium have pages for a few currencies only
    if (!CODES.includes(target) || !isValidPairRoute(leftMetal, target)) return null
    return { type: "metal-currency", metal: leftMetal, target }
  }
  return null
}

// Same catalog the selectors navigate with (src/lib/routes.ts): 210 currency
// pairs + 38 metal pages + gold-vs-silver.
export async function generateStaticParams() {
  return routeCatalog().map((pair) => ({ pair }))
}

// The page's own share image (src/app/[pair]/share.png/route.tsx) for
// og:image and twitter:image, with alt text describing what it shows.
async function shareImageMeta(slug: string) {
  const card = await cardFor(slug)
  const image = { url: `https://currencyversus.com/${slug}/share.png`, width: OG_SIZE.width, height: OG_SIZE.height, alt: card?.alt ?? "CurrencyVersus", type: "image/png" }
  return { openGraph: { images: [image] }, twitter: { images: [image] } }
}

// The same image, offered for download on the page (task 0b): its address
// and a file name with the image's own data date.
async function shareImageDownload(slug: string): Promise<ShareImageDownload> {
  const card = await cardFor(slug)
  return { href: `/${slug}/share.png`, fileName: shareDownloadName(slug, card?.date ?? null) }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair } = await params

  const share = await shareImageMeta(pair)
  const currencyParsed = parsePair(pair)
  if (currencyParsed) {
    const { base, target } = currencyParsed
    return {
      title: `${base} to ${target} Exchange Rate — Convert ${base} to ${target} | CurrencyVersus`,
      description: `Convert ${base} to ${target} with the latest ECB reference rate, updated each business day. Compare ${base} vs ${target} over 1 month, 1 year, 5 years, and 10 years. Free currency comparison tool.`,
      alternates: {
        canonical: `https://currencyversus.com/${base.toLowerCase()}-vs-${target.toLowerCase()}/`,
      },
      openGraph: {
        title: `${base} vs ${target} — Exchange Rate Comparison`,
        description: `${base} to ${target} conversion with daily ECB reference rates and historical data.`,
        url: `https://currencyversus.com/${base.toLowerCase()}-vs-${target.toLowerCase()}`,
        images: share.openGraph.images,
      },
      twitter: {
        card: "summary_large_image",
        title: `${base} vs ${target} — Exchange Rate Comparison`,
        description: `${base} to ${target} conversion with daily ECB reference rates and historical data.`,
        images: share.twitter.images,
      },
    }
  }

  const metalParsed = parseMetalPair(pair)
  if (!metalParsed) return { title: "Not Found" }

  if (metalParsed.type === "ratio") {
    return {
      title: "Gold/Silver Ratio Today — Compare Gold and Silver Prices | CurrencyVersus",
      description:
        "Track the gold/silver ratio from current gold and silver prices. Learn what the ratio measures and how it behaves in different market conditions.",
      alternates: { canonical: "https://currencyversus.com/gold-vs-silver/" },
      openGraph: { title: "Gold/Silver Ratio — CurrencyVersus", url: "https://currencyversus.com/gold-vs-silver/", images: share.openGraph.images },
      twitter: { card: "summary_large_image", images: share.twitter.images },
    }
  }

  const { metal, target } = metalParsed
  const name = metalName(metal)
  const slug = `${codeToSlug(metal)}-vs-${target.toLowerCase()}`
  return {
    title: `${name} Price in ${target} Today — Convert ${name} to ${target} | CurrencyVersus`,
    description: `${name} price in ${target} per ounce and per gram, from gold-api.com${target === "USD" ? "" : " converted at the daily ECB reference rate"}. Free precious metals converter.`,
    alternates: {
      canonical: `https://currencyversus.com/${slug}/`,
    },
    openGraph: {
      title: `${name} Price in ${target} — CurrencyVersus`,
      description: `${name} price in ${target} per ounce and per gram.`,
      url: `https://currencyversus.com/${slug}`,
      images: share.openGraph.images,
    },
    twitter: { card: "summary_large_image", images: share.twitter.images },
  }
}

export default async function PairPage({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair } = await params
  const shareImage = await shareImageDownload(pair)

  // --- Currency pair ---
  const currencyParsed = parsePair(pair)
  if (currencyParsed) {
    const { base, target } = currencyParsed
    const [rateData, history] = await Promise.all([
      getInitialRateData(base, target),
      getBuildTimeHistory(base, target),
    ])
    if (rateData === null) {
      console.warn(`[pair/page] No build-time rate for ${base}/${target} — rendering without initial data`)
    }
    const faqSchema = getFAQSchema(base, target, rateData?.rate ?? null, rateData?.date ?? null)

    // Every currency pair renders the pair layout of Phase 7 (all 210 since
    // 2026-11-20; the old layout was removed afterwards).
    const chart = await getBuildTimeChart(base, target)
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <PilotPairPageClient
          base={base}
          target={target}
          initialRate={rateData?.rate ?? null}
          initialDate={rateData?.date ?? null}
          initialHistory={history}
          chart={chart}
          builtAt={new Date().toISOString()}
          shareImage={shareImage}
        />
      </>
    )
  }

  // --- Metal pair ---
  const metalParsed = parseMetalPair(pair)
  if (!metalParsed) notFound()

  if (metalParsed.type === "ratio") {
    const [goldData, silverData] = await Promise.all([
      getBuildTimeMetalPrice("XAU"),
      getBuildTimeMetalPrice("XAG"),
    ])
    return (
      <MetalRatioPageClient
        initialGoldUsd={goldData?.price ?? null}
        initialSilverUsd={silverData?.price ?? null}
        initialGoldTime={goldData?.priceTime ?? null}
        initialSilverTime={silverData?.priceTime ?? null}
        shareImage={shareImage}
      />
    )
  }

  const { metal, target } = metalParsed
  const [metalData, usdRateData] = await Promise.all([
    getBuildTimeMetalPrice(metal),
    target === "USD"
      ? Promise.resolve(null)
      : getInitialRateData("USD", target),
  ])

  const initialUsdToTargetRate =
    target === "USD" ? 1 : (usdRateData?.rate ?? null)

  if (metalData === null) {
    console.warn(`[pair/page] No build-time metal price for ${metal}`)
  }

  return (
    <MetalPageClient
      metal={metal}
      target={target}
      initialOzPriceUsd={metalData?.price ?? null}
      initialPriceTime={metalData?.priceTime ?? null}
      initialUsdToTargetRate={initialUsdToTargetRate}
      initialFxDate={target === "USD" ? null : (usdRateData?.date ?? null)}
      shareImage={shareImage}
    />
  )
}
