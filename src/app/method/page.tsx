import type { Metadata } from "next"
import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { CHART_PERIODS } from "@/lib/history"
import type { ChartSampling } from "@/lib/history"
import { GRAMS_PER_TROY_OUNCE, GRAMS_PER_AVOIRDUPOIS_OUNCE } from "@/lib/metal-units"
import { PV, MONO, SANS } from "@/components/pilot/palette"

// Method page (Phase 8): what the site already does, in one place. No new
// figures or rankings: every number below is a definition or comes from the
// code it describes (CHART_PERIODS, the unit constants).

const ISSUES_URL = "https://github.com/mangdasire1/currencyversus/issues"

export const metadata: Metadata = {
  title: "Method — Where the Rates and Prices Come From | CurrencyVersus",
  description:
    "How CurrencyVersus sources and calculates exchange rates (ECB reference rates, cross rates), gold, silver, platinum and palladium prices (spot, troy ounce), historical data, and how to report an error.",
  alternates: { canonical: "https://currencyversus.com/method/" },
}

const SAMPLING_TEXT: Record<ChartSampling, string> = {
  daily: "every business day",
  "every-2nd-business-day": "every second business day",
  "every-3rd-business-day": "every third business day",
  weekly: "one rate per week",
  monthly: "one rate per month",
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-semibold" style={{ ...SANS, color: PV.text }}>
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed" style={{ color: PV.dim }}>
        {children}
      </div>
    </section>
  )
}

export default function MethodPage() {
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
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>Method</p>
          <h1 className="text-[28px] sm:text-4xl font-bold leading-tight">Where the rates and prices come from</h1>
          <p className="text-[15px] leading-relaxed" style={{ color: PV.dim }}>
            What every figure on CurrencyVersus is, where it comes from and how it is calculated.
          </p>
        </div>

        <Section id="fx" title="Exchange rates">
          <p>
            <Link href="/currencies/" className="underline underline-offset-4" style={{ color: PV.accentText }}>
              All currency pairs are listed on the currencies page
            </Link>
            .
          </p>
          <p>
            Currency rates are the European Central Bank&apos;s euro foreign exchange reference rates, served by the
            Frankfurter API. The ECB publishes them once per business day, at around 16:00 CET. They do not change at
            weekends or on ECB holidays; the page then shows the last published rate with its date.
          </p>
          <p>
            They are reference rates, not live market prices: there is no movement during the day, and a bank or card
            provider trading at the same moment may quote a different figure.
          </p>
          <p>
            <strong style={{ color: PV.text }}>Cross rates.</strong> The ECB publishes every currency against the euro
            only. For any other pair, such as US dollar to Turkish lira, the site divides the two euro rates of the
            same day (lira per euro ÷ dollars per euro). Both directions of a pair come from the same two published
            numbers, so the USD/TRY and TRY/USD pages show exact inverses. Results are rounded only for display, and
            never shown with more significant digits than the ECB rates they come from.
          </p>
          <p>
            <strong style={{ color: PV.text }}>Mid-market values.</strong> The figures sit between buying and selling
            prices. Bank margins, transfer fees and card fees are not included, so the rate you are offered will differ.
          </p>
        </Section>

        <Section id="metals" title="Gold, silver, platinum and palladium">
          <p>
            Precious metal prices are spot prices from gold-api.com, in US dollars per troy ounce. The provider uses the
            codes XAU (gold), XAG (silver), XPT (platinum) and XPD (palladium), which ISO 4217 defines as one troy ounce
            of the metal. Each page shows the provider&apos;s own update time; it may be when the provider last checked
            the price rather than the last trade.
          </p>
          <p>
            Gold and silver have a page for each of the site&apos;s currencies; platinum and palladium have pages in US
            dollars, euros, Turkish lira and British pounds.{" "}
            <Link href="/metals/" className="underline underline-offset-4" style={{ color: PV.accentText }}>
              All metal pages are listed on the metals page
            </Link>
            .
          </p>
          <p>
            In other currencies the US dollar price is multiplied by the ECB reference rate from US dollars to that
            currency. The two sources update on different schedules, so both dates are shown.
          </p>
          <p>
            <strong style={{ color: PV.text }}>Units.</strong> Precious metals are priced per troy ounce (
            <span style={MONO}>{GRAMS_PER_TROY_OUNCE} g</span>). The ounce used for food is the avoirdupois ounce (
            <span style={MONO}>{GRAMS_PER_AVOIRDUPOIS_OUNCE} g</span>), which is lighter. The converters on the metal
            pages also work in grams and kilograms; both ounces are exact definitions.
          </p>
          <p>
            <strong style={{ color: PV.text }}>Spot value is not a shop price.</strong> The figures are the theoretical
            value of pure metal at the spot price. A jeweller&apos;s or dealer&apos;s buying and selling prices are
            different: they include the dealer&apos;s margin, making charges for jewellery and coins, and taxes where
            they apply, and jewellery is often an alloy rather than pure metal. The site does not calculate values by
            purity (karat).
          </p>
          <p>
            For platinum, jewellery and bullion are sold to the public, but a dealer&apos;s buying and selling prices can
            be far apart. Palladium is rarely bought and sold by jewellers or bullion dealers, so for palladium the
            figure is a theoretical value only: in practice you cannot expect to buy or sell it at that price.
          </p>
          <p>
            The site has no historical metal prices for any of the four metals; metal pages show the current price only.
          </p>
        </Section>

        <Section id="history" title="Historical data">
          <p>
            Historical exchange rates are the same daily ECB reference rates. The comparison table on each currency pair
            page looks back from 1 month to 10 years; on pages with a chart, the two-dates tool accepts any date from
            1999-01-04, the first ECB reference rate.
          </p>
          <p>
            When a requested date is a weekend or a holiday, the rate of the last business day before it is used, and
            that day is shown next to the requested one.
          </p>
          <p>On pages with a chart, the line is drawn from a sample of the daily rates:</p>
          <ul className="flex flex-col gap-1 pl-5 list-disc">
            {CHART_PERIODS.map((p) => (
              <li key={p.key}>
                <span style={{ ...MONO, color: PV.text }}>{p.short}</span>: {SAMPLING_TEXT[p.sampling]}
              </li>
            ))}
          </ul>
          <p>
            Low and high are the lowest and highest daily reference rates in the period. They can fall on a day the
            sampled line does not draw, so they can lie slightly outside the line; they are not intraday levels.
          </p>
          <p>
            A percentage change compares two reference rates. It is not an investment return: it does not account for
            inflation, interest earned or any fee.
          </p>
        </Section>

        <Section id="report" title="Report an error">
          <p>
            If a figure looks wrong, please open an issue at{" "}
            <a href={ISSUES_URL} className="underline underline-offset-4 [overflow-wrap:anywhere]" style={{ color: PV.accentText }}>
              github.com/mangdasire1/currencyversus/issues
            </a>
            . It helps to include the page address, the figure you saw, the figure you expected and where it comes from,
            and the date and time you looked (with your time zone).
          </p>
          <p>
            The background texts about currencies and metals show the date they were last reviewed against sources.
          </p>
        </Section>
      </main>

      <footer className="text-center py-6 text-xs px-4" style={{ color: PV.faint }}>
        CurrencyVersus · Data from ECB via Frankfurter API and gold-api.com · For information only, not financial advice
      </footer>
    </div>
  )
}
