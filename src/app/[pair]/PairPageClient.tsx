"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useCallback } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TrendingUp } from "lucide-react"
import { CurrencySelect } from "@/components/CurrencySelect"
import { CurrencyConverter } from "@/components/CurrencyConverter"
import { HistoricalTable } from "@/components/HistoricalTable"
import { useExchangeRate } from "@/hooks/useExchangeRate"
import { CURRENCY_MAP } from "@/lib/currencies"
import { formatRate } from "@/lib/utils"

const ShaderBackground = dynamic(
  () => import("@/components/ShaderBackground").then((m) => m.ShaderBackground),
  { ssr: false }
)

interface PairPageClientProps {
  base: string
  target: string
}

export function PairPageClient({ base, target }: PairPageClientProps) {
  const router = useRouter()
  const { data } = useExchangeRate(base, target)
  const currentRate = data?.rates[target] ?? null
  const baseCurrency = CURRENCY_MAP[base]
  const targetCurrency = CURRENCY_MAP[target]

  const handleBaseChange = useCallback(
    (code: string) => {
      router.push(`/${code.toLowerCase()}-vs-${target.toLowerCase()}`)
    },
    [target, router]
  )

  const handleTargetChange = useCallback(
    (code: string) => {
      router.push(`/${base.toLowerCase()}-vs-${code.toLowerCase()}`)
    },
    [base, router]
  )

  const handleSwapNav = useCallback(() => {
    router.push(`/${target.toLowerCase()}-vs-${base.toLowerCase()}`)
  }, [base, target, router])

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
            <span
              className="text-xl font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-4xl">{baseCurrency?.flag}</span>
                <h1
                  className="text-3xl md:text-4xl font-bold text-white"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  {base}{" "}
                  <span className="text-slate-500">vs</span>{" "}
                  <span className="text-[#6366f1]">{target}</span>
                </h1>
                <span className="text-4xl">{targetCurrency?.flag}</span>
              </div>
              {currentRate !== null && targetCurrency && (
                <p className="text-slate-400 font-mono text-sm">
                  1 {base} ={" "}
                  <span className="text-white font-semibold">
                    {formatRate(currentRate, targetCurrency)} {target}
                  </span>
                </p>
              )}
            </div>

            {/* Currency selectors with routing */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <CurrencySelect value={base} onChange={handleBaseChange} label="From" />
                </div>
                <button
                  type="button"
                  onClick={handleSwapNav}
                  className="mt-6 px-3 py-2 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 hover:bg-[#6366f1]/20 transition-all text-[#6366f1] text-xs font-mono"
                >
                  ⇄ Swap
                </button>
                <div className="relative">
                  <CurrencySelect value={target} onChange={handleTargetChange} label="To" />
                </div>
              </div>
            </div>

            {/* Converter + stats */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <CurrencyConverter
                base={base}
                target={target}
                onBaseChange={handleBaseChange}
                onTargetChange={handleTargetChange}
              />

              <div className="glass-card p-6 flex flex-col gap-4">
                <h2
                  className="text-base font-semibold text-slate-300"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  Quick Stats
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Base", value: `${baseCurrency?.flag} ${base}` },
                    { label: "Target", value: `${targetCurrency?.flag} ${target}` },
                    {
                      label: "Current Rate",
                      value:
                        currentRate !== null && targetCurrency
                          ? formatRate(currentRate, targetCurrency)
                          : "—",
                    },
                    {
                      label: "Inverse Rate",
                      value:
                        currentRate !== null && baseCurrency
                          ? formatRate(1 / currentRate, baseCurrency)
                          : "—",
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                        {label}
                      </span>
                      <span className="text-base font-bold text-white font-mono">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <HistoricalTable base={base} target={target} currentRate={currentRate} />
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-600 font-mono">
          CurrencyVersus · Data from ECB via Frankfurter API · For educational purposes only
        </footer>
      </div>
    </>
  )
}
