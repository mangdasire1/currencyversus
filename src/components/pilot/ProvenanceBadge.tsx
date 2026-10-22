import { RefreshCw } from "lucide-react"
import { PV, MONO } from "./palette"
import { formatBadgeDate } from "@/lib/pilot-format"
import { formatUtcTime } from "@/lib/utils"
import { formatAge } from "@/lib/format"

interface ProvenanceBadgeProps {
  fxDate: string | null // ECB publication date of the rate shown
  fetchedAt: string | null // when this browser last checked (ISO)
  builtAt: string // when the page was built (ISO) — "last checked" until the browser checks
  stale: boolean
  staleAgeMs: number | null
  onRefresh: () => void
  refreshing: boolean
}

// One compact source badge instead of method text repeated around the page.
// The details live in the DOM (a native <details>), not injected on click, so
// crawlers and users without JavaScript read them too.
export function ProvenanceBadge({ fxDate, fetchedAt, builtAt, stale, staleAgeMs, onRefresh, refreshing }: ProvenanceBadgeProps) {
  // formatUtcTime already ends in "UTC"
  const checked = fetchedAt ? formatUtcTime(fetchedAt) : `${formatUtcTime(builtAt)} (when this page was built)`
  return (
    <details className="group" style={{ color: PV.dim }}>
      <summary className="flex flex-wrap items-center gap-x-3 gap-y-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: PV.raised, border: `1px solid ${PV.border}`, ...MONO }}>
          <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full" style={{ background: PV.accentFill }} />
          <span style={{ color: PV.text }}>ECB</span>
          <span>{formatBadgeDate(fxDate) ?? "date unavailable"}</span>
        </span>
        <span className="underline underline-offset-2" style={{ color: PV.accentText }}>
          <span className="group-open:hidden">Where this comes from</span>
          <span className="hidden group-open:inline">Hide details</span>
        </span>
        {stale && (
          <span style={{ color: PV.up }}>
            Showing saved data{staleAgeMs !== null ? ` (${formatAge(staleAgeMs)})` : ""}
          </span>
        )}
      </summary>
      <div className="mt-3 rounded-xl p-4 text-sm leading-relaxed flex flex-col gap-2" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
        <p>
          Rates are the European Central Bank&apos;s daily euro foreign exchange reference rates, served by the
          Frankfurter API. The ECB publishes them on business days at around 16:00 CET; they are not live market
          prices and do not change at weekends or on holidays.
        </p>
        <p>
          The figures are mid-market values: bank margins, transfer fees and card fees are not included, so the rate
          you are offered will differ.
        </p>
        <p style={MONO}>
          Rate date: {fxDate ?? "—"} · Last checked: {checked}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Check for updated rates now"
          className="self-start inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg disabled:opacity-60"
          style={{ color: PV.accentText, border: `1px solid ${PV.border}` }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          {refreshing ? "Updating…" : "Check for updates"}
        </button>
      </div>
    </details>
  )
}
