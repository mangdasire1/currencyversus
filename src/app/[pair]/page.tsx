import { notFound } from "next/navigation"
import { CURRENCIES } from "@/lib/currencies"
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
    description: `Convert ${base} to ${target}. View current exchange rate and historical trends over 10 years. Free currency comparison tool.`,
    openGraph: {
      title: `${base} vs ${target} — Exchange Rate Comparison`,
      description: `Real-time ${base} to ${target} conversion with historical data.`,
      url: `https://currencyversus.com/${base.toLowerCase()}-vs-${target.toLowerCase()}`,
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
  return <PairPageClient base={parsed.base} target={parsed.target} />
}
