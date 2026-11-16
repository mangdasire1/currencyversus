"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/Header"
import { CurrencyConverter } from "@/components/CurrencyConverter"
import { HomeHistoryTable } from "@/components/HomeHistoryTable"
import { PairChart } from "@/components/pilot/PairChart"
import { usePairChart } from "@/hooks/usePairChart"
import { DEFAULT_CHART_BOX } from "@/lib/chart"
import { DEFAULT_CHART_PERIOD } from "@/lib/history"
import { MetalIcon } from "@/components/MetalIcon"
import { MethodFooterLink } from "@/components/RelatedLinks"
import { useConversion } from "@/hooks/useConversion"
import { useMetalRate } from "@/hooks/useMetalRate"
import type { ChartPeriod, PeriodHistory } from "@/lib/history"
import type { ExchangeRate, TimePeriod } from "@/lib/types"
import { CURRENCY_MAP } from "@/lib/currencies"
import { isMetal, OZ_TO_GRAM } from "@/lib/metals"
import type { MetalCode } from "@/lib/metals"
import { formatCardUsd } from "@/lib/metal-cards"

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

interface HomeClientProps {
  initialGoldUsd: number | null
  initialSilverUsd: number | null
  initialPlatinumUsd: number | null
  initialPalladiumUsd: number | null
  // Build-time data for the default pair (page.tsx), embedded in the HTML
  defaultBase: string
  defaultTarget: string
  initialRate: number | null
  initialDate: string | null
  initialHistory: PeriodHistory<TimePeriod>[] | null
  initialChart: ChartPeriod[] | null
}

// Precious Metals cards. Each links to the metal's USD page.
const METAL_CARDS: { code: MetalCode; name: string; href: string; more: string }[] = [
  { code: "XAU", name: "Gold", href: "/gold-vs-usd", more: "See all gold prices →" },
  { code: "XAG", name: "Silver", href: "/silver-vs-usd", more: "See all silver prices →" },
  { code: "XPT", name: "Platinum", href: "/platinum-vs-usd", more: "See platinum prices →" },
  { code: "XPD", name: "Palladium", href: "/palladium-vs-usd", more: "See palladium prices →" },
]

export function HomeClient({
  initialGoldUsd,
  initialSilverUsd,
  initialPlatinumUsd,
  initialPalladiumUsd,
  defaultBase,
  defaultTarget,
  initialRate,
  initialDate,
  initialHistory,
  initialChart,
}: HomeClientProps) {
  const [base, setBase] = useState(defaultBase)
  const [target, setTarget] = useState(defaultTarget)
  // The embedded rate seeds the hooks' state (useState, not an effect), so the
  // server HTML and the first paint show it; the client then refreshes it.
  // It only ever applies to the default pair — the hooks check pair identity.
  const initialFx: ExchangeRate | null =
    initialRate !== null && initialDate !== null
      ? { base: defaultBase, date: initialDate, rates: { [defaultTarget]: initialRate } }
      : null
  const isDefaultPair = base === defaultBase && target === defaultTarget
  // The table's "Now" line; metals are quoted per gram so the unit is explicit.
  const conv = useConversion(base, target, { metalUnit: "g", initialFx })
  const forPair = conv.base === base && conv.quote === target // never show another pair's rate
  // The pair pages' chart (Phase 7), for the selected pair. The default pair's
  // periods are embedded, so its default period is in the server HTML.
  const fxPair = base !== target && !isMetal(base) && !isMetal(target)
  const chart = usePairChart(base, target, isDefaultPair ? initialChart : null)
  const [chartPeriod, setChartPeriod] = useState(DEFAULT_CHART_PERIOD)

  // Metal prices for Precious Metals section (refreshed client-side, seeded with build-time values)
  const { price: goldUsd } = useMetalRate("XAU", initialGoldUsd)
  const { price: silverUsd } = useMetalRate("XAG", initialSilverUsd)
  const { price: platinumUsd } = useMetalRate("XPT", initialPlatinumUsd)
  const { price: palladiumUsd } = useMetalRate("XPD", initialPalladiumUsd)
  const metalUsd: Record<MetalCode, number | null> = { XAU: goldUsd, XAG: silverUsd, XPT: platinumUsd, XPD: palladiumUsd }

  return (
    <>
      {/* Plain surface: no decorative background behind prices and text (Phase 8) */}
      <div className="plain-page relative z-10 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex flex-col gap-6">
            {/* Hero + Converter */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in-up">
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight font-heading">
                    Currency{" "}
                    <span className="text-[#6366f1]">Comparison</span>
                  </h1>
                  <p className="mt-2 text-slate-400 text-sm">
                    Latest ECB reference rates for 15 major currencies, updated each business day · Gold, silver, platinum and palladium prices from a separate source that updates more often than the daily ECB rate
                  </p>
                </div>
                <CurrencyConverter
                  base={base}
                  target={target}
                  onBaseChange={setBase}
                  onTargetChange={setTarget}
                  includeMetals={true}
                  showFlags={false}
                  initialFx={initialFx}
                  showInverse
                />
              </div>

              {/* Right column: the chart only. Base, target and the current rate are
                  already in the converter card; the inverse rate is on its result
                  line (showInverse). On narrow screens the chart follows the
                  converter and its result — the answer comes first. */}
              <div className="flex flex-col gap-6 min-w-0">
              {/* Chart — currency pairs only, like the historical table */}
              {fxPair && (
                <div className="glass-card p-6">
                  {chart.periods ? (
                    <PairChart base={base} target={target} periods={chart.periods} selected={chartPeriod} onSelect={setChartPeriod} />
                  ) : (
                    // Same plot height while this pair's series loads (no jump when it arrives)
                    <section aria-labelledby="chart-heading" className="flex flex-col gap-4">
                      <h2 id="chart-heading" className="text-lg font-semibold text-white font-heading">
                        {base} to {target} over time
                      </h2>
                      <div
                        className={`rounded-2xl flex items-center justify-center text-sm font-mono ${chart.error ? "text-amber-400" : "text-slate-500 animate-pulse"}`}
                        style={{ height: DEFAULT_CHART_BOX.height + 100, background: "rgba(255,255,255,0.03)" }}
                      >
                        {chart.error ? "Chart unavailable right now" : "Loading chart…"}
                      </div>
                    </section>
                  )}
                </div>
              )}
              </div>
            </section>

            {/* Historical table — hidden when a metal is selected */}
            {!isMetal(base) && !isMetal(target) && (
              <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <HomeHistoryTable
                  base={base}
                  target={target}
                  currentRate={forPair ? conv.rate : null}
                  currentLabel={forPair && conv.rate !== null ? conv.rateLabel : null}
                  currentDate={forPair ? conv.fxDate : null}
                  initialRows={isDefaultPair ? initialHistory : null}
                />
              </div>
            )}

            {/* Precious Metals — four cards; the full list is the /metals/ index */}
            <section id="metals" className="flex flex-col gap-4 scroll-mt-4 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              <div className="flex flex-wrap items-center justify-between gap-x-4">
                <h2 className="text-lg font-semibold text-slate-300 font-heading">
                  Precious Metals
                </h2>
                <Link href="/metals/" className="inline-flex items-center min-h-[44px] text-sm text-slate-300 underline underline-offset-4 hover:text-white">
                  All metal prices by currency
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {METAL_CARDS.map(({ code, name, href, more }) => {
                  const usd = metalUsd[code]
                  const gram = usd !== null ? usd / OZ_TO_GRAM : null
                  return (
                    <Link
                      key={code}
                      href={href}
                      className="glass-card p-5 flex flex-col gap-3 hover:border-[#6366f1]/40 hover:scale-[1.01] transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MetalIcon code={code} className="w-6 h-6" />
                          <span className="text-base font-bold text-white font-heading group-hover:text-[#6366f1] transition-colors">
                            {`${name} (${code})`}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                          USD · troy oz
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold font-mono text-white">
                            {usd !== null ? formatCardUsd(usd, code, usd) : "—"}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">/ oz</span>
                        </div>
                        <div className="text-sm font-mono text-slate-400">
                          {gram !== null && usd !== null ? `${formatCardUsd(gram, code, usd)} / g` : ""}
                        </div>
                      </div>
                      <div className="text-[10px] text-[#6366f1] font-mono uppercase tracking-wider group-hover:underline">
                        {more}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>

            {/* Popular pairs — target of the header's "Currencies" link */}
            <section id="currencies" className="flex flex-col gap-4 scroll-mt-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
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
                    CurrencyVersus is a free tool for comparing exchange rates between 15 major world currencies — including USD, EUR, GBP, JPY, TRY, CNY, INR, and more — plus gold, silver, platinum and palladium prices.
                  </p>
                  <p>
                    Currency rates are the European Central Bank{"'"}s daily reference rates: published once per business day (around 16:00 CET) and unchanged over weekends and holidays. Gold, silver, platinum and palladium prices come from a separate source (gold-api.com) that updates more often than the daily ECB rate; metal markets are closed at weekends, so prices then stay unchanged. Each result shows its own data time — for metals, the update time reported by the provider. Historical data spans 7 time periods — from 1 month to 10 years — so you can spot long-term trends at a glance.
                  </p>
                  <p>
                    Whether you{"'"}re a traveler planning a trip, an investor monitoring forex and precious metals markets, or a student learning about global economics, CurrencyVersus makes it easy to understand financial trends without any sign-up or fees.
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
                      desc: "Choose any two of 15 major world currencies or precious metals (Gold, Silver, Platinum, Palladium) to compare — from US Dollar to Turkish Lira and beyond.",
                    },
                    {
                      step: "02",
                      title: "View the latest rate",
                      desc: "See the latest published ECB reference rate (or metal price) with its data date, plus an instant converter for any amount.",
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

        <footer className="text-center py-6 flex flex-col items-center gap-1">
          <MethodFooterLink />
          <p className="text-xs text-slate-500 font-mono">
            FX data from European Central Bank via{" "}
            <a
              href="https://www.frankfurter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6366f1] hover:underline"
            >
              Frankfurter API
            </a>
            {" · "}
            Metal prices from{" "}
            <a
              href="https://gold-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6366f1] hover:underline"
            >
              gold-api.com
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
