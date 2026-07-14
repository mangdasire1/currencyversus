import { notFound } from "next/navigation"
import { CURRENCIES } from "@/lib/currencies"
import { getInitialRateData, getBuildTimeMetalPrice } from "@/lib/build-data"
import { getFAQSchema } from "@/lib/structured-data"
import { PairPageClient } from "./PairPageClient"
import { MetalPageClient } from "./MetalPageClient"
import { MetalRatioPageClient } from "./MetalRatioPageClient"
import type { MetalCode } from "@/lib/metals"

const CODES = CURRENCIES.map((c) => c.code)

const METAL_URL: Record<string, MetalCode> = {
  gold: "XAU",
  silver: "XAG",
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
    if (!CODES.includes(target)) return null
    return { type: "metal-currency", metal: leftMetal, target }
  }
  return null
}

export async function generateStaticParams() {
  const params: { pair: string }[] = []

  // Currency pairs: 15 × 14 = 210
  for (const base of CODES) {
    for (const target of CODES) {
      if (base !== target) {
        params.push({ pair: `${base.toLowerCase()}-vs-${target.toLowerCase()}` })
      }
    }
  }

  // Metal vs currency: gold/silver × 15 currencies = 30
  for (const metalSlug of ["gold", "silver"]) {
    for (const currency of CODES) {
      params.push({ pair: `${metalSlug}-vs-${currency.toLowerCase()}` })
    }
  }

  // Gold vs silver ratio: 1
  params.push({ pair: "gold-vs-silver" })

  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair } = await params

  const currencyParsed = parsePair(pair)
  if (currencyParsed) {
    const { base, target } = currencyParsed
    return {
      title: `${base} to ${target} Exchange Rate — Convert ${base} to ${target} | CurrencyVersus`,
      description: `Convert ${base} to ${target} with real-time exchange rates. Compare ${base} vs ${target} over 1 month, 1 year, 5 years, and 10 years. Free currency comparison tool.`,
      alternates: {
        canonical: `https://currencyversus.com/${base.toLowerCase()}-vs-${target.toLowerCase()}/`,
      },
      openGraph: {
        title: `${base} vs ${target} — Exchange Rate Comparison`,
        description: `Real-time ${base} to ${target} conversion with historical data.`,
        url: `https://currencyversus.com/${base.toLowerCase()}-vs-${target.toLowerCase()}`,
        images: [{ url: "https://currencyversus.com/logo.png", width: 1200, height: 630, alt: `${base} vs ${target} Exchange Rate` }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${base} vs ${target} — Exchange Rate Comparison`,
        description: `Real-time ${base} to ${target} conversion with historical data.`,
        images: ["https://currencyversus.com/logo.png"],
      },
    }
  }

  const metalParsed = parseMetalPair(pair)
  if (!metalParsed) return { title: "Not Found" }

  if (metalParsed.type === "ratio") {
    return {
      title: "Gold/Silver Ratio Today — Compare Gold and Silver Prices | CurrencyVersus",
      description:
        "Track the gold/silver ratio in real time. Learn what the ratio means, its historical range, and how investors use it to compare the relative value of gold and silver.",
      alternates: { canonical: "https://currencyversus.com/gold-vs-silver/" },
    }
  }

  const { metal, target } = metalParsed
  const metalName = metal === "XAU" ? "Gold" : "Silver"
  return {
    title: `${metalName} Price in ${target} Today — Convert ${metalName} to ${target} | CurrencyVersus`,
    description: `Live ${metalName.toLowerCase()} price in ${target} per ounce and per gram. Convert ${metalName.toLowerCase()} to ${target} with up-to-date market prices. Free precious metals converter.`,
    alternates: {
      canonical: `https://currencyversus.com/${metal === "XAU" ? "gold" : "silver"}-vs-${target.toLowerCase()}/`,
    },
    openGraph: {
      title: `${metalName} Price in ${target} — CurrencyVersus`,
      description: `Live ${metalName.toLowerCase()} price in ${target} per ounce and per gram.`,
      url: `https://currencyversus.com/${metal === "XAU" ? "gold" : "silver"}-vs-${target.toLowerCase()}`,
      images: [{ url: "https://currencyversus.com/logo.png", width: 1200, height: 630, alt: `${metalName} Price in ${target}` }],
    },
  }
}

export default async function PairPage({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair } = await params

  // --- Currency pair ---
  const currencyParsed = parsePair(pair)
  if (currencyParsed) {
    const { base, target } = currencyParsed
    const rateData = await getInitialRateData(base, target)
    if (rateData === null) {
      console.warn(`[pair/page] No build-time rate for ${base}/${target} — rendering without initial data`)
    }
    const faqSchema = getFAQSchema(base, target, rateData?.rate ?? null, rateData?.date ?? null)
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <PairPageClient
          base={base}
          target={target}
          initialRate={rateData?.rate ?? null}
          initialDate={rateData?.date ?? null}
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
        initialDate={goldData?.date ?? silverData?.date ?? null}
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
      initialUsdToTargetRate={initialUsdToTargetRate}
      initialDate={metalData?.date ?? null}
    />
  )
}
