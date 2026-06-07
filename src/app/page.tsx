"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { CurrencyConverter } from "@/components/CurrencyConverter"
import { HistoricalTable } from "@/components/HistoricalTable"
import { useExchangeRate } from "@/hooks/useExchangeRate"
import { CURRENCY_MAP } from "@/lib/currencies"

const POPULAR_PAIRS = [
  { base: "USD", target: "EUR" },
  { base: "USD", target: "TRY" },
  { base: "EUR", target: "GBP" },
  { base: "USD", target: "JPY" },
  { base: "EUR", target: "TRY" },
  { base: "USD", target: "CNY" },
  { base: "GBP", target: "USD" },
  { base: "USD", target: "INR" },
  { base: "EUR", target: "CHF" },
  { base: "USD", target: "KRW" },
  { base: "AUD", target: "USD" },
  { base: "USD", target: "BRL" },
]

const ShaderBackground = dynamic(
  () => import("@/components/ShaderBackground").then((m) => m.ShaderBackground),
  { ssr: false }
)

function PageContent() {
  const [base, setBase] = useState("USD")
  const [target, setTarget] = useState("EUR")
  const { data } = useExchangeRate(base, target)
  const currentRate = data?.rates[target] ?? null

  return (
    <>
      <ShaderBackground />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex flex-col gap-6">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-4">
                <div>
                  <h1
                    className="text-3xl md:text-4xl font-bold text-white leading-tight"
                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                  >
                    Currency{" "}
                    <span className="text-[#6366f1]">Comparison</span>
                  </h1>
                  <p className="mt-2 text-slate-400 text-sm">
                    Real-time exchange rates for 15 major currencies
                  </p>
                </div>
                <CurrencyConverter
                  base={base}
                  target={target}
                  onBaseChange={setBase}
                  onTargetChange={setTarget}
                />
              </div>

              <div className="glass-card p-6 flex flex-col gap-4">
                <h2
                  className="text-base font-semibold text-slate-300"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  Quick Stats
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Base", value: base },
                    { label: "Target", value: target },
                    {
                      label: "Current Rate",
                      value: currentRate
                        ? currentRate.toLocaleString("en-US", { maximumFractionDigits: 6 })
                        : "—",
                    },
                    {
                      label: "Inverse Rate",
                      value: currentRate
                        ? (1 / currentRate).toLocaleString("en-US", { maximumFractionDigits: 6 })
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

            {/* Popular pairs */}
            <section className="flex flex-col gap-4">
              <h2
                className="text-lg font-semibold text-slate-300"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                Popular Pairs
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {POPULAR_PAIRS.map(({ base: b, target: t }) => {
                  const bc = CURRENCY_MAP[b]
                  const tc = CURRENCY_MAP[t]
                  return (
                    <Link
                      key={`${b}-${t}`}
                      href={`/${b.toLowerCase()}-vs-${t.toLowerCase()}`}
                      className="glass-card p-3 flex flex-col gap-1 hover:border-[#6366f1]/30 hover:bg-[#6366f1]/5 transition-all group"
                    >
                      <div className="flex items-center gap-1 text-sm font-mono font-bold text-white group-hover:text-[#6366f1] transition-colors">
                        <span>{bc?.flag}</span>
                        <span className="text-slate-500 mx-0.5">/</span>
                        <span>{tc?.flag}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {b} → {t}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-600 font-mono">
          CurrencyVersus · Data from ECB via Frankfurter API · For educational purposes only
        </footer>
      </div>
    </>
  )
}

export default function Page() {
  return <PageContent />
}
