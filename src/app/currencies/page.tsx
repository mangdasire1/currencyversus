import type { Metadata } from "next"
import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { currenciesIndex } from "@/lib/currencies-index"
import { PV, SANS } from "@/components/pilot/palette"

// Currencies index: one place that links to every currency pair page, grouped
// by the currency you start from. Server-rendered, nothing waits for
// JavaScript. No figures here: each pair page shows its own ECB rate and date.
// scripts/verify-routes.mjs fails the build if a pair page is not linked.

export const metadata: Metadata = {
  title: "Exchange Rates for 15 Currencies — All Currency Pairs | CurrencyVersus",
  description:
    "Every currency pair on CurrencyVersus, grouped by currency: US dollar, euro, British pound, Japanese yen, Turkish lira and ten more. Each page shows the latest ECB reference rate, a 10-year chart and a comparison over seven periods.",
  alternates: { canonical: "https://currencyversus.com/currencies/" },
}

export default function CurrenciesIndexPage() {
  const entries = currenciesIndex()
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
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pb-12 flex flex-col gap-10">
        <div className="flex flex-col gap-2 pt-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>Currencies</p>
          <h1 className="text-[28px] sm:text-4xl font-bold leading-tight">Exchange rates for {entries.length} currencies</h1>
          <p className="text-[15px] leading-relaxed" style={{ color: PV.dim }}>
            Every currency pair on the site, grouped by the currency you start from. Each page shows the latest European
            Central Bank reference rate with its date, a chart and a comparison with earlier dates.
          </p>
          <nav aria-label="Jump to a currency">
            <ul className="flex flex-wrap gap-1 pt-2">
              {entries.map((e) => (
                <li key={e.code}>
                  <a
                    href={`#${e.code.toLowerCase()}`}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-2 text-sm underline-offset-4 hover:underline"
                    style={{ color: PV.accentText }}
                  >
                    {e.code}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {entries.map((entry) => (
          <section key={entry.code} id={entry.code.toLowerCase()} aria-labelledby={`h-${entry.code}`} className="flex flex-col gap-3 scroll-mt-4">
            <h2 id={`h-${entry.code}`} className="text-xl font-semibold">
              {entry.name} ({entry.code})
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {entry.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-center min-h-[44px] px-4 py-2 rounded-xl text-sm underline-offset-4 hover:underline"
                    style={{ background: PV.surface, border: `1px solid ${PV.border}`, color: PV.accentText }}
                  >
                    {l.text}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="text-[15px] leading-relaxed" style={{ color: PV.dim }}>
          <Link href="/method/#fx" className="underline underline-offset-4 inline-flex items-center min-h-[44px]" style={{ color: PV.accentText }}>
            How the exchange rates are sourced and calculated
          </Link>
        </p>
      </main>

      <footer className="text-center py-6 text-xs px-4" style={{ color: PV.faint }}>
        CurrencyVersus · Data from ECB via Frankfurter API · For information only, not financial advice
      </footer>
    </div>
  )
}
