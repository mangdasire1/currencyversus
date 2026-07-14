"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { TrendingUp, ArrowLeft, RefreshCw } from "lucide-react"
import { useMetalRate } from "@/hooks/useMetalRate"
import { GOLD_SILVER_RATIO_INFO } from "@/lib/metal-info"

const ShaderBackground = dynamic(
  () => import("@/components/ShaderBackground").then((m) => m.ShaderBackground),
  { ssr: false }
)

interface MetalRatioPageClientProps {
  initialGoldUsd: number | null
  initialSilverUsd: number | null
  initialDate: string | null
}

export function MetalRatioPageClient({
  initialGoldUsd,
  initialSilverUsd,
  initialDate,
}: MetalRatioPageClientProps) {
  const { price: goldUsd, date: goldDate, stale: goldStale } = useMetalRate("XAU", initialGoldUsd)
  const { price: silverUsd, stale: silverStale } = useMetalRate("XAG", initialSilverUsd)

  const ratio =
    goldUsd !== null && silverUsd !== null && silverUsd > 0
      ? goldUsd / silverUsd
      : null

  const displayDate = goldDate ?? initialDate
  const isStale = goldStale || silverStale

  const ratioCategory =
    ratio === null
      ? null
      : ratio > 80
      ? { label: "High — Silver historically cheap vs Gold", color: "text-amber-400" }
      : ratio < 50
      ? { label: "Low — Gold historically cheap vs Silver", color: "text-emerald-400" }
      : { label: "In historical range (50–80)", color: "text-slate-400" }

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

        <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex flex-col gap-6">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🥇</span>
                <h1 className="text-3xl md:text-4xl font-bold text-white font-heading">
                  Gold <span className="text-slate-500">/</span>{" "}
                  <span className="text-[#6366f1]">Silver</span> Ratio
                </h1>
                <span className="text-4xl">🥈</span>
              </div>
              {ratio !== null ? (
                <p className="text-slate-300 font-mono text-sm">
                  1 oz Gold ={" "}
                  <span className="text-white font-semibold">
                    {ratio.toFixed(2)} oz Silver
                  </span>
                </p>
              ) : (
                <p className="text-slate-500 font-mono text-sm">Loading ratio…</p>
              )}
              {displayDate && (
                <p className="text-xs text-slate-600 font-mono flex items-center gap-1.5">
                  {isStale && <RefreshCw className="w-3 h-3 text-amber-400" />}
                  {isStale ? "Showing cached data · " : ""}
                  Prices as of {displayDate} · Source: gold-api.com
                </p>
              )}
            </div>

            {/* Ratio card */}
            <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                Gold / Silver Ratio
              </p>
              <p className="text-7xl font-bold font-mono text-white">
                {ratio !== null ? ratio.toFixed(1) : "—"}
              </p>
              {ratioCategory && (
                <p className={`text-sm font-mono ${ratioCategory.color}`}>
                  {ratioCategory.label}
                </p>
              )}
              <div className="w-full mt-2 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Gold (USD/oz)", value: goldUsd !== null ? `$${goldUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—" },
                  { label: "Silver (USD/oz)", value: silverUsd !== null ? `$${silverUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—" },
                  { label: "Ratio", value: ratio !== null ? `${ratio.toFixed(2)} : 1` : "—" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                      {label}
                    </span>
                    <span className="text-base font-bold text-white font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* About GSR */}
            <section className="glass-card p-6 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-white font-heading">
                What Is the Gold/Silver Ratio?
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed font-body">
                {GOLD_SILVER_RATIO_INFO.description}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed font-body">
                {GOLD_SILVER_RATIO_INFO.historical}
              </p>
              <p className="text-xs text-slate-500 italic font-body">
                💡 {GOLD_SILVER_RATIO_INFO.funFact}
              </p>
            </section>

            {/* How to interpret */}
            <section className="glass-card p-6 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-white font-heading">
                How to Interpret the Ratio
              </h2>
              <ul className="flex flex-col gap-2.5">
                {GOLD_SILVER_RATIO_INFO.interpretation.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2 text-sm text-slate-300 font-body"
                  >
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#6366f1] flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            {/* Quick links */}
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-slate-400 font-heading">
                Explore Metal Prices
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["USD", "EUR", "GBP", "TRY"].map((cur) => (
                  <Link
                    key={cur}
                    href={`/gold-vs-${cur.toLowerCase()}`}
                    className="glass-card p-3 text-center text-sm font-mono text-slate-300 hover:text-[#6366f1] hover:border-[#6366f1]/40 transition-all"
                  >
                    🥇 Gold / {cur}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-600 font-mono">
          CurrencyVersus · Metal prices from gold-api.com · For educational purposes only
        </footer>
      </div>
    </>
  )
}
