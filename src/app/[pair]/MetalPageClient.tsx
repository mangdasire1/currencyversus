"use client"

import { Header } from "@/components/Header"
import { metalCrumbs } from "@/lib/breadcrumbs"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { useConversionInputs } from "@/hooks/useConversion"
import { MetalUnitConverter } from "@/components/MetalUnitConverter"
import { RelatedLinks, MethodFooterLink } from "@/components/RelatedLinks"
import { metalRelatedLinks } from "@/lib/related"
import { DataFreshness } from "@/components/DataFreshness"
import { MetalIcon } from "@/components/MetalIcon"
import { CURRENCY_MAP } from "@/lib/currencies"
import { METAL_INFO } from "@/lib/metal-info"
import { computeConversion } from "@/lib/conversion"
import type { MetalCode } from "@/lib/metals"
import type { ExchangeRate } from "@/lib/types"
import { formatUtcTime } from "@/lib/utils"
import { editorialReviewLabel } from "@/lib/editorial"
import { localContextText } from "@/lib/editorial-sections"
import { formatSignificant, metalPriceSignificant } from "@/lib/metal-units"

interface MetalPageClientProps {
  metal: MetalCode
  target: string
  initialOzPriceUsd: number | null
  initialPriceTime: string | null
  initialUsdToTargetRate: number | null
  initialFxDate: string | null
}

export function MetalPageClient({
  metal,
  target,
  initialOzPriceUsd,
  initialPriceTime,
  initialUsdToTargetRate,
  initialFxDate,
}: MetalPageClientProps) {
  // Build-time FX seed (USD→target) so the first paint has a price.
  const initialFx: ExchangeRate | null =
    target !== "USD" && initialUsdToTargetRate !== null && initialFxDate !== null
      ? { base: "USD", date: initialFxDate, rates: { [target]: initialUsdToTargetRate } }
      : null

  // One fetch, two units — both computed by the shared conversion model.
  const inputs = useConversionInputs(metal, target, {
    initialFx,
    initialMetalUsd: { [metal]: initialOzPriceUsd },
    initialMetalTime: { [metal]: initialPriceTime },
  })
  const perOz = computeConversion({ ...inputs, metalUnit: "oz" })
  const perGram = computeConversion({ ...inputs, metalUnit: "g" })

  const info = METAL_INFO[metal]
  const targetCurrency = CURRENCY_MAP[target]

  const ozPriceTarget = perOz.rate
  // Every price on this page — headline, converter, Quick Stats, table — is
  // rounded to the same significant digits: those of the least precise input
  // (the provider's metal price; the ECB USD→target leg if any). See
  // METAL_PRICE_DECIMALS in metal-units.ts.
  const resultSignificant = perOz.significant ?? metalPriceSignificant(metal, initialOzPriceUsd ?? 0)
  const formatMetal = (value: number) => formatSignificant(value, resultSignificant)
  const gramPriceTarget = perGram.rate
  const livePriceUsd = inputs.metals?.[metal]?.usdPerOz ?? null
  const priceTimeLabel = formatUtcTime(perOz.metalPriceTime)

  const COMMON_AMOUNTS: { label: string; grams: number | null }[] = [
    { label: "1 g", grams: 1 },
    { label: "5 g", grams: 5 },
    { label: "10 g", grams: 10 },
    { label: "20 g", grams: 20 },
    { label: "50 g", grams: 50 },
    { label: "100 g", grams: 100 },
    { label: "1 oz", grams: null },
    { label: "5 oz", grams: null },
    { label: "10 oz", grams: null },
  ]

  // null when this metal has no context for the currency: no section, no heading
  const localCtx = localContextText(info, target)

  return (
    <>
      {/* Plain surface: no decorative background behind prices and text (Phase 8) */}
      <div className="plain-page relative z-10 min-h-screen flex flex-col">
        <Header width="max-w-6xl" current="metals" />

        <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex flex-col gap-6">
            {/* Page title, under the breadcrumb trail */}
            <div className="flex flex-col gap-2">
              <Breadcrumbs crumbs={metalCrumbs(metal, target)} />
              <div className="flex items-center gap-3 flex-wrap">
                <MetalIcon code={metal} className="w-9 h-9" />
                <h1 className="text-3xl md:text-4xl font-bold text-white font-heading">
                  {info.name} Price{" "}
                  <span className="text-slate-500">in</span>{" "}
                  <span className="text-[#6366f1]">{target}</span>
                </h1>
              </div>

              {ozPriceTarget !== null && gramPriceTarget !== null ? (
                <p className="text-white font-semibold font-mono text-sm">
                  {perOz.rateLabel}
                  <span className="text-slate-500 font-normal">{" · "}</span>
                  {perGram.rateLabel}
                </p>
              ) : perOz.status === "loading" ? (
                <p className="text-slate-500 font-mono text-sm">Loading price…</p>
              ) : (
                <p className="text-amber-400 font-mono text-sm">
                  {perOz.missing.includes("metal") ? "Metal price" : "Exchange rate"} unavailable right now.
                </p>
              )}

              <p className="text-xs text-slate-600 font-mono">
                Provider{"'"}s last update: {priceTimeLabel ?? "— (time not provided by source)"} · Source: gold-api.com
                {" "}(time reported by the provider; it may be when the provider last checked the price, not the last market trade)
                {perOz.fetchedAt ? ` · Last checked ${formatUtcTime(perOz.fetchedAt)}` : ""}
              </p>
              {perOz.fxDate && (
                <p className="text-xs text-slate-600 font-mono">
                  USD→{target} conversion: ECB reference rate of {perOz.fxDate}
                </p>
              )}
              {perOz.status === "stale" && (
                <DataFreshness conv={perOz} onRefresh={inputs.refresh} refreshing={inputs.refreshing} />
              )}
            </div>

            {/* Weight ⇄ value converter (Phase 8): the page's single converter, at
                the top. Price per troy ounce in the target currency comes from the
                same conversion model as the figures above. */}
            <MetalUnitConverter
              metalName={info.name}
              quote={{ kind: "money", code: target }}
              pricePerTroyOunce={ozPriceTarget}
              significant={resultSignificant}
              status={perOz.status === "loading" ? "Loading price…" : ozPriceTarget === null ? "Price unavailable right now." : null}
            />
            {/* Where the spot value differs from a price the public can trade at */}
            {info.retailNote && <p className="text-sm text-slate-400 leading-relaxed">{info.retailNote}</p>}

            {/* Quick Stats */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <h2 className="text-base font-semibold text-slate-300 font-heading">Quick Stats</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Price per oz",
                    value: ozPriceTarget !== null
                      ? `${formatMetal(ozPriceTarget)} ${target}`
                      : "—",
                  },
                  {
                    label: "Price per gram",
                    value: gramPriceTarget !== null
                      ? `${formatMetal(gramPriceTarget)} ${target}`
                      : "—",
                  },
                  {
                    label: "Price in USD",
                    value: livePriceUsd !== null
                      ? `${formatSignificant(livePriceUsd, metalPriceSignificant(metal, livePriceUsd))} USD`
                      : "—",
                  },
                  {
                    label: "Provider update",
                    value: priceTimeLabel ?? "—",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                      {label}
                    </span>
                    <span className="text-sm font-bold text-white font-mono break-all">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Common amounts table */}
            <section className="glass-card p-6 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-white font-heading">
                {info.name} to {target} — Common Amounts
              </h2>
              {ozPriceTarget !== null && gramPriceTarget !== null ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-xs text-slate-500 font-mono uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="text-right py-2 text-xs text-slate-500 font-mono uppercase tracking-wider">
                          Value ({target})
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {COMMON_AMOUNTS.map(({ label, grams }) => {
                        const isOz = grams === null
                        const multiplier = isOz ? 1 : 1
                        const ozCount = isOz
                          ? parseInt(label.split(" ")[0])
                          : null
                        const gramCount = !isOz ? parseInt(label.split(" ")[0]) : null
                        const value = isOz && ozCount !== null
                          ? ozPriceTarget * ozCount
                          : gramCount !== null
                          ? gramPriceTarget * gramCount
                          : null
                        void multiplier
                        return (
                          <tr key={label} className="hover:bg-white/3">
                            <td className="py-2.5 font-mono text-slate-300">{label} {info.name}</td>
                            <td className="py-2.5 font-mono text-white text-right font-semibold">
                              {value !== null
                                ? `${formatMetal(value)} ${target}`
                                : "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 font-mono text-sm">Loading…</p>
              )}
            </section>

            {/* About + Key Factors (left out while a metal has no text yet) */}
            {info.description && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="glass-card p-6 flex flex-col gap-4">
                  <h2 className="text-lg font-semibold text-white font-heading">
                    About {info.name} as an Asset
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed font-body">
                    {info.description}
                  </p>
                  {info.funFact && (
                    <p className="text-xs text-slate-500 italic font-body">
                      💡 {info.funFact}
                    </p>
                  )}
                </section>

                {info.factors.length > 0 && (
                  <section className="glass-card p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-white font-heading">
                      What Drives {info.name} Prices
                    </h2>
                    <ul className="flex flex-col gap-2.5">
                      {info.factors.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-sm text-slate-300 font-body"
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#6366f1] flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {info.description && <p className="text-xs text-slate-600 font-mono">{editorialReviewLabel([metal])}</p>}

            {/* Local context */}
            {localCtx && (
              <section className="glass-card p-5 flex flex-col gap-3 border border-[#6366f1]/20 bg-[#6366f1]/5">
                <p className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#6366f1]">
                  <MetalIcon code={metal} className="w-3.5 h-3.5" /> {info.name} &amp; {target} — Local Context
                </p>
                <p className="text-sm text-slate-300 leading-relaxed font-body">
                  {localCtx}
                </p>
              </section>
            )}

            <RelatedLinks links={metalRelatedLinks(metal, target)} />
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-600 font-mono flex flex-col items-center">
          <span>CurrencyVersus · Metal prices from gold-api.com · For educational purposes only</span>
          <MethodFooterLink />
        </footer>
      </div>
    </>
  )
}
