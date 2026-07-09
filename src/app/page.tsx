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
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in-up">
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight font-heading">
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
                <h2 className="text-base font-semibold text-slate-300 font-heading">
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

            <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <HistoricalTable base={base} target={target} currentRate={currentRate} />
            </div>

            {/* Popular pairs */}
            <section className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <h2 className="text-lg font-semibold text-slate-300 font-heading">
                Popular Pairs
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {POPULAR_PAIRS.map(({ base: b, target: t }, i) => {
                  const bc = CURRENCY_MAP[b]
                  const tc = CURRENCY_MAP[t]
                  return (
                    <Link
                      key={`${b}-${t}`}
                      href={`/${b.toLowerCase()}-vs-${t.toLowerCase()}`}
                      className="glass-card p-4 flex flex-col gap-2 hover:border-[#6366f1]/40 hover:scale-[1.02] transition-all group cursor-pointer"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-2xl">
                          <span>{bc?.flag}</span>
                          <span className="text-slate-600 text-sm mx-0.5">/</span>
                          <span>{tc?.flag}</span>
                        </div>
                      </div>
                      <div className="text-xs font-mono font-semibold text-white group-hover:text-[#6366f1] transition-colors">
                        {b} → {t}
                      </div>
                      <div className="text-[10px] text-slate-500 font-body">
                        {bc?.shortName} / {tc?.shortName}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>

            {/* What is CurrencyVersus? */}
            <section className="flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <div className="glass-card p-6 md:p-8 flex flex-col gap-4">
                <h2 className="text-xl font-bold text-white font-heading">
                  What is CurrencyVersus?
                </h2>
                <div className="flex flex-col gap-3 text-sm text-slate-300 leading-relaxed font-body">
                  <p>
                    CurrencyVersus is a free tool for comparing exchange rates between 15 major world currencies — including USD, EUR, GBP, JPY, TRY, CNY, INR, and more.
                  </p>
                  <p>
                    Track real-time rates and explore how currencies have performed over the past decade. Historical data spans 7 time periods — from 1 month to 10 years — so you can spot long-term trends at a glance.
                  </p>
                  <p>
                    Whether you{"'"}re a traveler planning a trip, an investor monitoring forex markets, or a student learning about global economics, CurrencyVersus makes it easy to understand currency trends without any sign-up or fees.
                  </p>
                </div>
              </div>

              {/* How It Works */}
              <div className="glass-card p-6 md:p-8 flex flex-col gap-5">
                <h2 className="text-xl font-bold text-white font-heading">
                  How It Works
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      step: "01",
                      title: "Select two currencies",
                      desc: "Choose any two of 15 major world currencies to compare — from US Dollar to Turkish Lira and beyond.",
                    },
                    {
                      step: "02",
                      title: "View the live rate",
                      desc: "See the current exchange rate updated from the European Central Bank, plus an instant converter for any amount.",
                    },
                    {
                      step: "03",
                      title: "Explore historical trends",
                      desc: "Analyze performance over 7 time periods — 1 month, 3 months, 6 months, 1 year, 3 years, 5 years, and 10 years.",
                    },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-2xl font-bold font-mono text-[#6366f1]">{step}</span>
                      <p className="text-sm font-semibold text-white font-heading">{title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed font-body">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className="text-center py-6 flex flex-col gap-1">
          <p className="text-xs text-slate-500 font-mono">
            Data from European Central Bank via{" "}
            <a
              href="https://www.frankfurter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6366f1] hover:underline"
            >
              Frankfurter API
            </a>
          </p>
          <p className="text-xs text-slate-600 font-body">
            Built for learning · Not financial advice
          </p>
        </footer>
      </div>
    </>
  )
}

export default function Page() {
  return <PageContent />
}
