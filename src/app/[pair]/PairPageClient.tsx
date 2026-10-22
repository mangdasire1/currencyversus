"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TrendingUp } from "lucide-react"
import { CurrencyConverter } from "@/components/CurrencyConverter"
import { HistoricalTable } from "@/components/HistoricalTable"
import { useConversion } from "@/hooks/useConversion"
import { CURRENCY_MAP } from "@/lib/currencies"
import { CURRENCY_INFO } from "@/lib/currency-info"
import type { ExchangeRate, TimePeriod } from "@/lib/types"
import type { PeriodHistory } from "@/lib/history"
import { formatUtcTime } from "@/lib/utils"
import { getFAQItems } from "@/lib/structured-data"
import { editorialReviewLabel } from "@/lib/editorial"
import { funFactCards } from "@/lib/editorial-sections"
import { navigateSelection, navigateSwap, pairPath } from "@/lib/routes"
import type { PairNavigation } from "@/lib/routes"

// One-line notice carried across the navigation when a same-currency pick was
// turned into a swap. sessionStorage, read once on the next page.
const SWAP_NOTICE_KEY = "cv_swap_notice"
const NOTICE_MS = 6000

function rememberSwapNotice(nav: PairNavigation, picked: string) {
  if (!nav.swapped) return
  try {
    sessionStorage.setItem(
      SWAP_NOTICE_KEY,
      JSON.stringify({ path: nav.path, text: `${picked} was already selected on the other side, so the two were swapped.` })
    )
  } catch {
    // storage unavailable — navigation still works, only the notice is lost
  }
}

function takeSwapNotice(path: string): string | null {
  try {
    const raw = sessionStorage.getItem(SWAP_NOTICE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(SWAP_NOTICE_KEY)
    const notice = JSON.parse(raw) as { path?: unknown; text?: unknown }
    return notice.path === path && typeof notice.text === "string" ? notice.text : null
  } catch {
    return null
  }
}

const ShaderBackground = dynamic(
  () => import("@/components/ShaderBackground").then((m) => m.ShaderBackground),
  { ssr: false }
)

interface PairPageClientProps {
  base: string
  target: string
  initialRate: number | null
  initialDate: string | null
  initialHistory?: PeriodHistory<TimePeriod>[] | null // embedded in the server HTML
}

export function PairPageClient({ base, target, initialRate, initialDate, initialHistory }: PairPageClientProps) {
  const router = useRouter()

  // Build a full ExchangeRate object from server-provided props so useState in
  // useExchangeRate can initialise directly — no lazy initialiser, no closure.
  const serverRate: ExchangeRate | null =
    initialRate !== null && initialDate !== null
      ? { base, date: initialDate, rates: { [target]: initialRate } }
      : null

  const conv = useConversion(base, target, { initialFx: serverRate })
  const forThisPair = conv.base === base && conv.quote === target
  const currentRate = forThisPair ? conv.rate : null
  const baseCurrency = CURRENCY_MAP[base]
  const targetCurrency = CURRENCY_MAP[target]

  // All navigation goes through the route catalog: picking the code that is
  // already on the other side swaps the sides, and no selection can lead to
  // a page the build did not generate.
  const go = useCallback(
    (nav: PairNavigation | null, picked?: string) => {
      if (!nav) return
      if (picked) rememberSwapNotice(nav, picked)
      router.push(nav.path)
    },
    [router]
  )

  const handleBaseChange = useCallback(
    (code: string) => go(navigateSelection({ base, target }, "base", code), code),
    [base, target, go]
  )

  const handleTargetChange = useCallback(
    (code: string) => go(navigateSelection({ base, target }, "target", code), code),
    [base, target, go]
  )

  const handleSwapNav = useCallback(() => go(navigateSwap({ base, target })), [base, target, go])

  const [swapNotice, setSwapNotice] = useState<string | null>(null)
  useEffect(() => {
    const text = takeSwapNotice(pairPath(base, target))
    if (!text) return
    setSwapNotice(text)
    const t = setTimeout(() => setSwapNotice(null), NOTICE_MS)
    return () => clearTimeout(t)
  }, [base, target])

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
              {currentRate !== null && (
                <p className="text-white font-semibold font-mono text-sm">{conv.rateLabel}</p>
              )}
              <p role="status" className="text-xs text-amber-400 font-mono min-h-0">
                {swapNotice}
              </p>
              {forThisPair && conv.fxDate && (
                <p className="text-xs text-slate-600 font-mono">
                  ECB reference rate of {conv.fxDate} (published business days ~16:00 CET)
                  {conv.fetchedAt ? ` · Last checked ${formatUtcTime(conv.fetchedAt)}` : ""}
                  {" "}· Mid-market rate, bank spreads and fees not included
                </p>
              )}
            </div>

            {/* Single control set (converter navigates between pair pages) + stats */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <CurrencyConverter
                base={base}
                target={target}
                onBaseChange={handleBaseChange}
                onTargetChange={handleTargetChange}
                onSwap={handleSwapNav}
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
                      value: currentRate !== null ? conv.rateLabel : conv.status === "loading" ? "…" : "Unavailable",
                    },
                    {
                      label: "Inverse Rate",
                      value: currentRate !== null ? conv.inverseRateLabel : conv.status === "loading" ? "…" : "Unavailable",
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                        {label}
                      </span>
                      <span className="text-sm font-bold text-white font-mono break-words">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <HistoricalTable base={base} target={target} current={conv} initialRows={initialHistory} />

            {/* FAQ — same items as the FAQPage JSON-LD (src/lib/structured-data.ts).
                At build time both render from the embedded rate, so the HTML
                text matches the schema; after load the answers follow the
                live rate the page shows. */}
            <section className="glass-card p-6 flex flex-col gap-4" aria-labelledby="faq-heading">
              <h2
                id="faq-heading"
                className="text-lg font-semibold text-white"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                Frequently Asked Questions
              </h2>
              <div className="flex flex-col gap-4">
                {getFAQItems(
                  base,
                  target,
                  forThisPair && conv.rate !== null ? conv.rate : initialRate,
                  forThisPair && conv.fxDate ? conv.fxDate : initialDate
                ).map((item) => (
                  <div key={item.question} className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-slate-200">{item.question}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Content sections */}
            {(() => {
              const baseInfo = CURRENCY_INFO[base]
              const targetInfo = CURRENCY_INFO[target]
              if (!baseInfo || !targetInfo) return null
              return (
                <>
                  {/* A: About this currency pair */}
                  <section className="glass-card p-6 flex flex-col gap-4">
                    <h2
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-space-grotesk)" }}
                    >
                      About {base} / {target}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
                          {baseCurrency?.flag} {base} — {baseInfo.name}
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-dm-sans)" }}>
                          {baseInfo.description}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
                          {targetCurrency?.flag} {target} — {targetInfo.name}
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-dm-sans)" }}>
                          {targetInfo.description}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* B: Key Factors */}
                  <section className="glass-card p-6 flex flex-col gap-4">
                    <h2
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-space-grotesk)" }}
                    >
                      Key Factors Affecting {base}/{target}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-3">
                        <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
                          {baseCurrency?.flag} {base} Drivers
                        </p>
                        <ul className="flex flex-col gap-2">
                          {baseInfo.factors.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm text-slate-300" style={{ fontFamily: "var(--font-dm-sans)" }}>
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#6366f1] flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col gap-3">
                        <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
                          {targetCurrency?.flag} {target} Drivers
                        </p>
                        <ul className="flex flex-col gap-2">
                          {targetInfo.factors.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm text-slate-300" style={{ fontFamily: "var(--font-dm-sans)" }}>
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#6366f1] flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* C: Did You Know? — only for currencies that have a fun fact;
                      no section at all when neither has one */}
                  {funFactCards([baseInfo, targetInfo]).length > 0 && (
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {funFactCards([baseInfo, targetInfo]).map((card) => (
                        <div
                          key={card.code}
                          className="glass-card p-5 flex flex-col gap-3 border border-[#6366f1]/20 bg-[#6366f1]/5"
                        >
                          <p className="text-xs font-mono uppercase tracking-wider text-[#6366f1]">
                            💡 Did You Know? — {card.code}
                          </p>
                          <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-dm-sans)" }}>
                            {card.text}
                          </p>
                        </div>
                      ))}
                    </section>
                  )}

                  {/* D: Economy Overview */}
                  <section className="glass-card p-6 flex flex-col gap-4">
                    <h2
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-space-grotesk)" }}
                    >
                      Economy Overview
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
                          {baseCurrency?.flag} {baseInfo.country}
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-dm-sans)" }}>
                          {baseInfo.economy}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
                          {targetCurrency?.flag} {targetInfo.country}
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: "var(--font-dm-sans)" }}>
                          {targetInfo.economy}
                        </p>
                      </div>
                    </div>
                  </section>

                  <p className="text-xs text-slate-600 font-mono">{editorialReviewLabel([base, target])}</p>
                </>
              )
            })()}
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-600 font-mono">
          CurrencyVersus · Data from ECB via Frankfurter API · For educational purposes only
        </footer>
      </div>
    </>
  )
}
