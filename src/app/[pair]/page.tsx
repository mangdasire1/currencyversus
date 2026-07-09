import { notFound } from "next/navigation"
import { CURRENCIES } from "@/lib/currencies"
import { getInitialRateData } from "@/lib/build-data"
import { getFAQSchema } from "@/lib/structured-data"
import { PairPageClient } from "./PairPageClient"

const CODES = CURRENCIES.map((c) => c.code)

function parsePair(pair: string): { base: string; target: string } | null {
  const parts = pair.split("-vs-")
  if (parts.length !== 2) return null
  const base = parts[0].toUpperCase()
  const target = parts[1].toUpperCase()
  if (!CODES.includes(base) || !CODES.includes(target) || base === target) return null
  return { base, target }
}

export async function generateStaticParams() {
  const params: { pair: string }[] = []
  for (const base of CODES) {
    for (const target of CODES) {
      if (base !== target) {
        params.push({ pair: `${base.toLowerCase()}-vs-${target.toLowerCase()}` })
      }
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair } = await params
  const parsed = parsePair(pair)
  if (!parsed) return { title: "Not Found" }
  const { base, target } = parsed
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
      images: [
        {
          url: "https://currencyversus.com/logo.png",
          width: 1200,
          height: 630,
          alt: `${base} vs ${target} Exchange Rate`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${base} vs ${target} — Exchange Rate Comparison`,
      description: `Real-time ${base} to ${target} conversion with historical data.`,
      images: ["https://currencyversus.com/logo.png"],
    },
  }
}

export default async function PairPage({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair } = await params
  const parsed = parsePair(pair)
  if (!parsed) notFound()
  const { base, target } = parsed
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
