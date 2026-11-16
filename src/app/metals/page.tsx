import type { Metadata } from "next"
import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { getBuildTimeMetalPrice } from "@/lib/build-data"
import { metalsIndex, RATIO_LINK } from "@/lib/metals-index"
import { GRAMS_PER_TROY_OUNCE, GRAMS_PER_AVOIRDUPOIS_OUNCE, formatSignificant, metalPriceSignificant, valueOfWeight } from "@/lib/metal-units"
import { formatUtcTime } from "@/lib/utils"
import { MetalIcon } from "@/components/MetalIcon"
import { PV, MONO, SANS } from "@/components/pilot/palette"

// Metals index (Phase A6): one place that links to every metal page, with the
// four current prices. Server-rendered from the same build-time prices as the
// metal pages — nothing here waits for JavaScript. No new figures or claims:
// prices come from the provider, the unit sizes are definitions, and the two
// notes repeat what the metal pages and the method page already say.
//
// scripts/verify-metals.mjs fails the build if a price or a link is missing.

export const metadata: Metadata = {
  title: "Gold, Silver, Platinum and Palladium Prices by Currency | CurrencyVersus",
  description:
    "Current gold, silver, platinum and palladium prices per troy ounce and per gram in US dollars, with a page for each currency the metal is listed in. Spot prices from gold-api.com with the provider's update time.",
  alternates: { canonical: "https://currencyversus.com/metals/" },
}

export default async function MetalsIndexPage() {
  const entries = metalsIndex()
  const prices = await Promise.all(entries.map((e) => getBuildTimeMetalPrice(e.code as Parameters<typeof getBuildTimeMetalPrice>[0])))

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
          <p className="text-xs uppercase tracking-widest" style={{ color: PV.faint }}>Metals</p>
          <h1 className="text-[28px] sm:text-4xl font-bold leading-tight">Gold, silver, platinum and palladium prices</h1>
          <p className="text-[15px] leading-relaxed" style={{ color: PV.dim }}>
            The price of one troy ounce of each metal in US dollars, and a page for every currency the metal is listed
            in. Each price shows the provider&apos;s own update time; the metal&apos;s page checks for a newer price
            while you view it.
          </p>
        </div>

        {entries.map((entry, i) => {
          const data = prices[i]
          const price = data?.price ?? null
          const sig = price !== null ? metalPriceSignificant(entry.code, price) : 0
          const updated = formatUtcTime(data?.priceTime ?? null)
          const headingId = `metal-${entry.code.toLowerCase()}`
          return (
            <section key={entry.code} aria-labelledby={headingId} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <MetalIcon code={entry.code} className="w-7 h-7" />
                <h2 id={headingId} className="text-xl font-semibold">
                  {entry.name} ({entry.code})
                </h2>
              </div>

              <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-1" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
                {price !== null ? (
                  <>
                    <p className="text-2xl" style={{ ...MONO, color: PV.text }}>
                      {formatSignificant(price, sig)} USD <span className="text-sm" style={{ color: PV.dim }}>per troy ounce</span>
                    </p>
                    <p className="text-sm" style={{ ...MONO, color: PV.dim }}>
                      {formatSignificant(valueOfWeight(1, "g", price), sig)} USD per gram
                    </p>
                    <p className="text-xs mt-1" style={{ ...MONO, color: PV.faint }}>
                      <span>Provider update</span> <span>{updated ?? "time not given by the provider"}</span>
                    </p>
                  </>
                ) : (
                  // verify-metals stops the build before this could be published
                  <p className="text-sm" style={{ color: PV.up }}>Price unavailable right now.</p>
                )}
              </div>

              <nav aria-label={`${entry.name} price by currency`}>
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
              </nav>
            </section>
          )
        })}

        <section aria-labelledby="ratio" className="flex flex-col gap-3">
          <h2 id="ratio" className="text-xl font-semibold">Gold against silver</h2>
          <Link
            href={RATIO_LINK.href}
            className="flex items-center min-h-[44px] px-4 py-2 rounded-xl text-sm underline-offset-4 hover:underline"
            style={{ background: PV.surface, border: `1px solid ${PV.border}`, color: PV.accentText }}
          >
            {RATIO_LINK.text}
          </Link>
        </section>

        <section aria-labelledby="unit" className="flex flex-col gap-3">
          <h2 id="unit" className="text-xl font-semibold">The unit: troy ounce</h2>
          <div className="flex flex-col gap-3 text-[15px] leading-relaxed" style={{ color: PV.dim }}>
            <p>
              Precious metals are priced per troy ounce (<span style={MONO}>{GRAMS_PER_TROY_OUNCE} g</span>). The ounce
              used for food is the avoirdupois ounce (<span style={MONO}>{GRAMS_PER_AVOIRDUPOIS_OUNCE} g</span>), which
              is lighter. Each metal page has a converter that also works in grams and kilograms.
            </p>
            <p>
              The figure is the spot value of the pure metal. A jeweller&apos;s or dealer&apos;s buying and selling
              prices are different.
            </p>
            <p>
              <Link href="/method/#metals" className="underline underline-offset-4 inline-flex items-center min-h-[44px]" style={{ color: PV.accentText }}>
                How the metal prices are sourced and calculated
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="text-center py-6 text-xs px-4" style={{ color: PV.faint }}>
        CurrencyVersus · Metal prices from gold-api.com · For information only, not financial advice
      </footer>
    </div>
  )
}
