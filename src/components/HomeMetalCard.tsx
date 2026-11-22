import Link from "next/link"
import { MetalIcon } from "./MetalIcon"
import { SavedDataNote } from "./SavedDataNote"
import { formatCardUsd } from "@/lib/metal-cards"
import { GRAMS_PER_TROY_OUNCE, GRAMS_PER_AVOIRDUPOIS_OUNCE } from "@/lib/metal-units"
import { OZ_TO_GRAM } from "@/lib/metals"
import { metalPagePath } from "@/lib/home-metal-card"

// Home page, right column, when a metal is selected (no history to chart).
// Only what the page already shows elsewhere: the same USD prices as the
// Precious Metals cards (same rule, formatCardUsd), the troy-ounce note of
// the metals and method pages, and a link to the metal's own page.
export function HomeMetalCard({
  metal,
  name,
  other,
  usdPerOz,
  stale,
  staleAgeMs,
}: {
  metal: string
  name: string
  other: string
  usdPerOz: number | null
  stale: boolean
  staleAgeMs: number | null
}) {
  const href = metalPagePath(metal, other)
  const currency = href.split("-vs-")[1].replace("/", "").toUpperCase()
  return (
    <section aria-labelledby="metal-card-heading" className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MetalIcon code={metal} className="w-6 h-6" />
        <h2 id="metal-card-heading" className="text-lg font-semibold text-white font-heading">
          {`${name} (${metal})`}
        </h2>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold font-mono text-white">
          {usdPerOz !== null ? formatCardUsd(usdPerOz, metal, usdPerOz) : "—"}
          <span className="text-sm font-normal text-slate-400"> per troy ounce</span>
        </p>
        <p className="text-sm font-mono text-slate-300">
          {usdPerOz !== null ? `${formatCardUsd(usdPerOz / OZ_TO_GRAM, metal, usdPerOz)} per gram` : ""}
        </p>
        {stale && usdPerOz !== null && (
          <p className="text-sm">
            <SavedDataNote ageMs={staleAgeMs} />
          </p>
        )}
        <p className="text-xs text-slate-400">In US dollars, from gold-api.com. The site has no historical metal prices, so there is no chart.</p>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">
        Precious metals are priced per troy ounce ({GRAMS_PER_TROY_OUNCE} g). The ounce used for food is the avoirdupois
        ounce ({GRAMS_PER_AVOIRDUPOIS_OUNCE} g), which is lighter.
      </p>
      <Link href={href} className="inline-flex items-center min-h-[44px] text-sm text-slate-300 underline underline-offset-4 hover:text-white">
        {`${name} price in ${currency}`}
      </Link>
    </section>
  )
}
