"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { TrendingUp, ArrowLeft, RefreshCw } from "lucide-react"
import { useMetalRate } from "@/hooks/useMetalRate"
import { CurrencyConverter } from "@/components/CurrencyConverter"
import { CURRENCY_MAP } from "@/lib/currencies"
import { METAL_INFO } from "@/lib/metal-info"
import { OZ_TO_GRAM } from "@/lib/metals"
import type { MetalCode } from "@/lib/metals"

const ShaderBackground = dynamic(
  () => import("@/components/ShaderBackground").then((m) => m.ShaderBackground),
  { ssr: false }
)

interface MetalPageClientProps {
  metal: MetalCode
  target: string
  initialOzPriceUsd: number | null
  initialUsdToTargetRate: number | null
  initialDate: string | null
}

function formatMetal(value: number, decimals: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function getDecimals(target: string): number {
  const c = CURRENCY_MAP[target]
  if (!c) return 2
  // For very large rates (JPY, KRW), use 0 decimals for oz and 2 for grams
  return c.decimals
}

export function MetalPageClient({
  metal,
  target,
  initialOzPriceUsd,
  initialUsdToTargetRate,
  initialDate,
}: MetalPageClientProps) {
  // Local converter state (pre-set to this metal/currency pair)
  const [convBase, setConvBase] = useState<string>(metal)
  const [convTarget, setConvTarget] = useState<string>(target)

  const { price: livePriceUsd, date, stale } = useMetalRate(metal, initialOzPriceUsd)
  const info = METAL_INFO[metal]
  const targetCurrency = CURRENCY_MAP[target]
  const usdToTarget = initialUsdToTargetRate ?? 1
  const ozDecimals = getDecimals(target)
  const gramDecimals = ozDecimals === 0 ? 0 : 2

  const ozPriceTarget = livePriceUsd !== null ? livePriceUsd * usdToTarget : null
  const gramPriceTarget = ozPriceTarget !== null ? ozPriceTarget / OZ_TO_GRAM : null
  const displayDate = date ?? initialDate

  const COMMON_AMOUNTS: { label: string; grams: number | null }[] = [
    { label: "1 g", grams: 1 },
    { label: "5 g", grams: 5 },
    { label: "10 g", grams: 10 },
    { label: "20 g", grams: 20 },
    { label: "50 g", grams: 50 },
    { label: "100 g", grams: 100 },
    { label: "1 oz", grams: null },
    { label: "5 oz", grams: null },
    { label: "10 oz", grams: null },
  ]

  const localCtx = info.localContext[target]

  return (
    <>
      <ShaderBackground />
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30">
              <TrendingUp className="w-4 h-4 text-[#6366f1]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-heading">
              Currency<span className="text-[#6366f1]">Versus</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors font-mono"
          >
            <ArrowLeft className="w-3 h-3" />
            All currencies
          </Link>
        </header>

        <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex flex-col gap-6">
            {/* Page title */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-4xl">{info.icon}</span>
                <h1 className="text-3xl md:text-4xl font-bold text-white font-heading">
                  {info.name} Price{" "}
                  <span className="text-slate-500">in</span>{" "}
                  <span className="text-[#6366f1]">{target}</span>
                </h1>
                {targetCurrency && <span className="text-4xl">{targetCurrency.flag}</span>}
              </div>

              {ozPriceTarget !== null && gramPriceTarget !== null ? (
                <p className="text-slate-300 font-mono text-sm">
                  1 oz {info.name} ={" "}
                  <span className="text-white font-semibold">
                    {formatMetal(ozPriceTarget, ozDecimals)} {target}
                  </span>
                  {" · "}
                  1 g ={" "}
                  <span className="text-white font-semibold">
                    {formatMetal(gramPriceTarget, gramDecimals)} {target}
                  </span>
                </p>
              ) : (
                <p className="text-slate-500 font-mono text-sm">Loading price…</p>
              )}

              {displayDate && (
                <p className="text-xs text-slate-600 font-mono flex items-center gap-1.5">
                  {stale && <RefreshCw className="w-3 h-3 text-amber-400" />}
                  {stale ? "Showing cached data · " : ""}
                  Price as of {displayDate} · Source: gold-api.com
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <h2 className="text-base font-semibold text-slate-300 font-heading">Quick Stats</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Price per oz",
                    value: ozPriceTarget !== null
                      ? `${formatMetal(ozPriceTarget, ozDecimals)} ${target}`
                      : "—",
                  },
                  {
                    label: "Price per gram",
                    value: gramPriceTarget !== null
                      ? `${formatMetal(gramPriceTarget, gramDecimals)} ${target}`
                      : "—",
                  },
                  {
                    label: "Price in USD",
                    value: livePriceUsd !== null
                      ? `${formatMetal(livePriceUsd, 2)} USD`
                      : "—",
                  },
                  {
                    label: "Updated",
                    value: displayDate ?? "—",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                      {label}
                    </span>
                    <span className="text-sm font-bold text-white font-mono break-all">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Common amounts table */}
            <section className="glass-card p-6 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-white font-heading">
                {info.name} to {target} — Common Amounts
              </h2>
              {ozPriceTarget !== null && gramPriceTarget !== null ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-xs text-slate-500 font-mono uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="text-right py-2 text-xs text-slate-500 font-mono uppercase tracking-wider">
                          Value ({target})
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {COMMON_AMOUNTS.map(({ label, grams }) => {
                        const isOz = grams === null
                        const multiplier = isOz ? 1 : 1
                        const ozCount = isOz
                          ? parseInt(label.split(" ")[0])
                          : null
                        const gramCount = !isOz ? parseInt(label.split(" ")[0]) : null
                        const value = isOz && ozCount !== null
                          ? ozPriceTarget * ozCount
                          : gramCount !== null
                          ? gramPriceTarget * gramCount
                          : null
                        void multiplier
                        return (
                          <tr key={label} className="hover:bg-white/3">
                            <td className="py-2.5 font-mono text-slate-300">{label} {info.name}</td>
                            <td className="py-2.5 font-mono text-white text-right font-semibold">
                              {value !== null
                                ? `${formatMetal(value, isOz ? ozDecimals : gramDecimals)} ${target}`
                                : "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 font-mono text-sm">Loading…</p>
              )}
            </section>

            {/* Converter pre-set to this metal/currency pair */}
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-white font-heading">
                {info.name} Converter
              </h2>
              <CurrencyConverter
                base={convBase}
                target={convTarget}
                onBaseChange={setConvBase}
                onTargetChange={setConvTarget}
                includeMetals={true}
                initialOzPriceBaseUsd={metal === convBase ? initialOzPriceUsd : undefined}
                initialOzPriceTargetUsd={metal === convTarget ? initialOzPriceUsd : undefined}
              />
            </section>

            {/* About + Key Factors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="glass-card p-6 flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-white font-heading">
                  About {info.name} as an Asset
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed font-body">
                  {info.description}
                </p>
                <p className="text-xs text-slate-500 italic font-body">
                  💡 {info.funFact}
                </p>
              </section>

              <section className="glass-card p-6 flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-white font-heading">
                  What Drives {info.name} Prices
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {info.factors.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-slate-300 font-body"
                    >
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#6366f1] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Local context */}
            {localCtx && (
              <section className="glass-card p-5 flex flex-col gap-3 border border-[#6366f1]/20 bg-[#6366f1]/5">
                <p className="text-xs font-mono uppercase tracking-wider text-[#6366f1]">
                  {info.icon} {info.name} &amp; {targetCurrency?.flag} {target} — Local Context
                </p>
                <p className="text-sm text-slate-300 leading-relaxed font-body">
                  {localCtx}
                </p>
              </section>
            )}
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-600 font-mono">
          CurrencyVersus · Metal prices from gold-api.com · For educational purposes only
        </footer>
      </div>
    </>
  )
}
