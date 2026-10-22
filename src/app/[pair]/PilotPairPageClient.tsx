"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, TrendingUp } from "lucide-react"
import { useConversion } from "@/hooks/useConversion"
import { usePairNavigation } from "@/hooks/usePairNavigation"
import { parseAmount } from "@/lib/amount"
import { CURRENCY_MAP } from "@/lib/currencies"
import { CURRENCY_INFO } from "@/lib/currency-info"
import { getFAQItems } from "@/lib/structured-data"
import { editorialReviewLabel } from "@/lib/editorial"
import { funFactCards } from "@/lib/editorial-sections"
import { pairTitle } from "@/lib/pilot-format"
import type { ChartPeriod, PeriodHistory } from "@/lib/history"
import type { ExchangeRate, TimePeriod } from "@/lib/types"
import { PilotConverter } from "@/components/pilot/PilotConverter"
import { ProvenanceBadge } from "@/components/pilot/ProvenanceBadge"
import { PairChart } from "@/components/pilot/PairChart"
import { TwoDatesTool } from "@/components/pilot/TwoDatesTool"
import { PilotHistoryTable } from "@/components/pilot/PilotHistoryTable"
import { PV, MONO, SANS } from "@/components/pilot/palette"

interface PilotPairPageClientProps {
  base: string
  target: string
  initialRate: number | null
  initialDate: string | null
  initialHistory: PeriodHistory<TimePeriod>[] | null
  chart: ChartPeriod[] | null
  builtAt: string
}

// Pilot layout (Phase 7) for the fixed set in src/lib/pilot.ts. Answer first:
// title, the single converter and the result fill the first screen on mobile.
export function PilotPairPageClient({ base, target, initialRate, initialDate, initialHistory, chart, builtAt }: PilotPairPageClientProps) {
  const serverRate: ExchangeRate | null =
    initialRate !== null && initialDate !== null ? { base, date: initialDate, rates: { [target]: initialRate } } : null

  const [amount, setAmount] = useState("1")
  const parsed = parseAmount(amount)
  const conv = useConversion(base, target, { initialFx: serverRate, amount: parsed.ok ? parsed.value : null })
  const forThisPair = conv.base === base && conv.quote === target
  const currentRate = forThisPair ? conv.rate : null
  const fxDate = (forThisPair ? conv.fxDate : null) ?? initialDate
  const { handleBaseChange, handleTargetChange, handleSwapNav, swapNotice } = usePairNavigation(base, target)

  const baseInfo = CURRENCY_INFO[base]
  const targetInfo = CURRENCY_INFO[target]
  const tenYear = chart?.find((p) => p.key === "10y") ?? null
  const cards = funFactCards([baseInfo, targetInfo])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: PV.bg, color: PV.text, ...SANS }}>
      <header className="flex items-center justify-between px-4 sm:px-6 py-3">
        <Link href="/" className="flex items-center gap-2 min-h-[44px]">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: PV.raised, border: `1px solid ${PV.border}` }}>
            <TrendingUp className="w-4 h-4" style={{ color: PV.accentText }} aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Currency<span style={{ color: PV.accentText }}>Versus</span>
          </span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-sm min-h-[44px]" style={{ color: PV.dim }}>
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All currencies
        </Link>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pb-10 flex flex-col gap-8">
        {/* 1. Title */}
        <div className="flex flex-col gap-1 pt-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>Exchange rate</p>
          <h1 className="text-[28px] sm:text-4xl font-bold leading-tight">{pairTitle(base, target)}</h1>
          <p className="text-sm" style={{ ...MONO, color: PV.dim }}>
            {CURRENCY_MAP[base]?.flag} {base} / {target} {CURRENCY_MAP[target]?.flag}
          </p>
          <p role="status" className="text-sm" style={{ color: PV.up }}>{swapNotice}</p>
        </div>

        {/* 2–3. Single converter + result */}
        <PilotConverter
          base={base}
          target={target}
          amount={amount}
          onAmountChange={setAmount}
          conv={conv}
          onBaseChange={handleBaseChange}
          onTargetChange={handleTargetChange}
          onSwap={handleSwapNav}
        />

        {/* 4. Source badge (details in the DOM) */}
        <ProvenanceBadge
          fxDate={fxDate}
          fetchedAt={forThisPair ? conv.fetchedAt : null}
          builtAt={builtAt}
          stale={forThisPair && conv.status === "stale"}
          staleAgeMs={forThisPair ? conv.staleAgeMs : null}
          onRefresh={conv.refresh}
          refreshing={conv.refreshing}
        />

        {/* 5. Chart */}
        {chart && <PairChart base={base} target={target} periods={chart} />}

        {/* AD SLOT (reserved, intentionally empty): a full-width block can be
            placed here, between the chart and the two-dates tool. No ad code
            until traffic justifies it (Phase 7 brief). */}

        {/* 6. Same amount, two dates */}
        <TwoDatesTool
          base={base}
          target={target}
          defaultRequested={tenYear?.requestedStart ?? builtAt.slice(0, 10)}
          defaultUsed={tenYear?.start ?? null}
          currentRate={currentRate ?? initialRate}
          currentDate={fxDate}
          builtAt={builtAt}
        />

        {/* 7. Full historical table */}
        <PilotHistoryTable
          base={base}
          target={target}
          currentRate={currentRate ?? initialRate}
          currentLabel={forThisPair && conv.rate !== null ? conv.rateLabel : null}
          currentDate={fxDate}
          initialRows={initialHistory}
        />

        {/* 8. About the pair */}
        {baseInfo && targetInfo && (
          <section aria-labelledby="about-heading" className="flex flex-col gap-5">
            <h2 id="about-heading" className="text-lg font-semibold">About {base} and {target}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[baseInfo, targetInfo].map((info) => (
                <div key={info.code} className="flex flex-col gap-2 min-w-0">
                  <h3 className="text-sm font-semibold" style={{ color: PV.text }}>{info.name} ({info.code})</h3>
                  <p className="text-sm leading-relaxed" style={{ color: PV.dim }}>{info.description}</p>
                  <p className="text-sm leading-relaxed" style={{ color: PV.dim }}>{info.economy}</p>
                  <h4 className="text-xs uppercase tracking-widest mt-1" style={{ color: PV.faint }}>What moves it</h4>
                  <ul className="list-disc pl-5 text-sm flex flex-col gap-1" style={{ color: PV.dim }}>
                    {info.factors.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            {cards.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cards.map((card) => (
                  <div key={card.code} className="rounded-xl p-4" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
                    <p className="text-xs uppercase tracking-widest" style={{ color: PV.accentText }}>Did you know? — {card.code}</p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: PV.dim }}>{card.text}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* FAQ — same items as the FAQPage JSON-LD */}
        <section aria-labelledby="faq-heading" className="flex flex-col gap-4">
          <h2 id="faq-heading" className="text-lg font-semibold">Frequently Asked Questions</h2>
          {getFAQItems(
            base,
            target,
            forThisPair && conv.rate !== null ? conv.rate : initialRate,
            forThisPair && conv.fxDate ? conv.fxDate : initialDate
          ).map((item) => (
            <div key={item.question} className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">{item.question}</h3>
              <p className="text-sm leading-relaxed" style={{ color: PV.dim }}>{item.answer}</p>
            </div>
          ))}
        </section>

        <p className="text-xs" style={{ color: PV.faint }}>{editorialReviewLabel([base, target])}</p>
      </main>

      {/* 9. Footer */}
      <footer className="text-center py-6 text-xs px-4" style={{ color: PV.faint }}>
        CurrencyVersus · Data from ECB via Frankfurter API · For information only, not financial advice
      </footer>
    </div>
  )
}
