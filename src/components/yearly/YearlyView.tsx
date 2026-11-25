import Link from "next/link"
import { chartGeometry } from "@/lib/chart"
import type { ChartBox } from "@/lib/chart"
import { trNumber, trDateShort, trDateLong } from "@/lib/format-tr"
import type { YearRow } from "@/lib/yearly"
import { yearCells, newestFirst, yearLabel, yearlyCsvPath, yearEndPoints, yearSpan, rateText } from "@/lib/by-year"
import type { YearlyPair } from "@/lib/by-year"
import { pairPath } from "@/lib/routes"
import { Direction } from "@/components/pilot/Direction"
import { PV, MONO, SANS } from "@/components/pilot/palette"
import { yearlyText } from "@/lib/by-year-text"

const BOX: ChartBox = { width: 720, height: 220, padTop: 12, padBottom: 12 }

// Content of a by-year page, both languages (task C2). Server-rendered: the
// chart, the table and every note are in the static HTML; nothing waits for
// JavaScript and nothing is fetched in the browser.
export function YearlyView({ pair, rows, lang }: { pair: YearlyPair; rows: YearRow[]; lang: "en" | "tr" }) {
  const { base, target } = pair
  const tr = lang === "tr"
  const latest = rows[rows.length - 1]
  const first = rows[0]
  const t = yearlyText(pair, lang, first.year)
  const num = (s: string) => (tr ? trNumber(s) : s)
  const day = (iso: string) => (tr ? trDateShort(iso)! : iso)

  // chart: year-end rates, Y axis from the lowest to the highest point; each
  // label with the precision of the year it comes from
  const points = yearEndPoints(rows)
  const g = chartGeometry(points, BOX)
  const axis = (n: number) => num(rateText(n, rows.find((r) => r.end.rate === n)?.end.sig ?? Math.min(...rows.map((r) => r.sig))))

  return (
    <>
      <p className="text-[15px] leading-relaxed" style={{ color: PV.dim }}>{t.intro}</p>

      {/* Chart: hand-drawn SVG of the year-end rates */}
      <section aria-labelledby="yearly-chart-heading" className="flex flex-col gap-3">
        <h2 id="yearly-chart-heading" className="text-lg font-semibold" style={{ ...SANS, color: PV.text }}>
          {t.chartHeading(yearSpan(rows))}
        </h2>
        <div className="rounded-2xl p-3 sm:p-4" style={{ background: PV.surface, border: `1px solid ${PV.border}` }}>
          <div className="relative" style={{ height: BOX.height }}>
            <svg role="img" aria-label={t.chartLabel(rows, axis)} viewBox={`0 0 ${BOX.width} ${BOX.height}`} preserveAspectRatio="none" width="100%" height={BOX.height} className="block">
              <line x1="0" x2={BOX.width} y1={BOX.padTop} y2={BOX.padTop} stroke={PV.border} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              <line x1="0" x2={BOX.width} y1={BOX.height - BOX.padBottom} y2={BOX.height - BOX.padBottom} stroke={PV.border} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              <path d={g.path} fill="none" stroke={PV.accentText} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="absolute left-1 top-0 -translate-y-1/2 px-1 text-xs" style={{ ...MONO, color: PV.dim, background: PV.surface }}>
              {axis(g.domain[1])}
            </span>
            <span className="absolute left-1 bottom-0 translate-y-1/2 px-1 text-xs" style={{ ...MONO, color: PV.dim, background: PV.surface }}>
              {axis(g.domain[0])}
            </span>
          </div>
          <div className="mt-3 flex justify-between text-xs" style={{ ...MONO, color: PV.faint }}>
            <span>{first.year}</span>
            <span>{latest.year}</span>
          </div>
        </div>
        <p className="text-sm" style={{ color: PV.dim }}>{t.chartNote(tr ? trDateLong(latest.end.date)! : latest.end.date)}</p>
      </section>

      {/* Table: newest year first; scrolls sideways inside its own box on narrow screens */}
      <section aria-labelledby="yearly-table-heading" className="flex flex-col gap-3">
        <h2 id="yearly-table-heading" className="text-lg font-semibold" style={{ ...SANS, color: PV.text }}>{t.tableHeading}</h2>
        <p className="text-sm" style={{ color: PV.dim }}>{t.unit}</p>
        <div className="relative overflow-x-auto rounded-xl" style={{ border: `1px solid ${PV.border}` }} tabIndex={0} role="region" aria-labelledby="yearly-table-heading">
          <table className="w-full min-w-[640px] text-sm" style={{ background: PV.surface }}>
            <thead>
              <tr className="text-xs uppercase tracking-wider" style={{ color: PV.dim, borderBottom: `1px solid ${PV.border}` }}>
                {t.columns.map((c, i) => (
                  <th key={c} scope="col" className={`${i === 0 ? "text-left" : "text-right"} font-normal py-3 px-3`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {newestFirst(rows).map((r) => {
                const c = yearCells(r)
                return (
                  <tr key={r.year} style={{ borderBottom: `1px solid ${PV.border}` }}>
                    <th scope="row" className="text-left font-normal py-3 px-3" style={{ ...MONO, color: PV.text }}>
                      {r.year}
                      {c.coverage !== "full" && (
                        <span className="block text-xs" style={{ ...SANS, color: PV.up }}>{yearLabel(r, lang).replace(/^\d{4} \((.*)\)$/, "$1")}</span>
                      )}
                    </th>
                    <td className="text-right py-3 px-3" style={{ ...MONO, color: PV.text }}>
                      {num(c.end)}
                      <span className="block text-xs" style={{ color: PV.dim }}>{day(c.endDate)}</span>
                    </td>
                    <td className="text-right py-3 px-3" style={{ ...MONO, color: PV.text }}>{num(c.average)}</td>
                    <td className="text-right py-3 px-3" style={{ ...MONO, color: PV.text }}>
                      {num(c.low)}
                      <span className="block text-xs" style={{ color: PV.dim }}>{day(c.lowDate)}</span>
                    </td>
                    <td className="text-right py-3 px-3" style={{ ...MONO, color: PV.text }}>
                      {num(c.high)}
                      <span className="block text-xs" style={{ color: PV.dim }}>{day(c.highDate)}</span>
                    </td>
                    <td className="text-right py-3 px-3">
                      <Direction value={c.changePct} locale={lang} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm">
          <a href={yearlyCsvPath(base, target)} download className="inline-flex items-center min-h-[44px] underline underline-offset-4" style={{ color: PV.accentText }}>
            {t.csv}
          </a>
          <span style={{ color: PV.dim }}> {t.csvNote}</span>
        </p>

        {/* How the figures are made, then what the change is not */}
        <p className="text-sm leading-relaxed" style={{ color: PV.dim }}>
          {t.method}{" "}
          <Link href={tr ? "/tr/yontem/#gecmis" : "/method/#history"} className="underline underline-offset-4 inline-flex items-center min-h-[44px]" style={{ color: PV.accentText }}>
            {t.methodLink}
          </Link>
        </p>
        <p className="text-sm leading-relaxed" style={{ color: PV.text }}>{t.warning}</p>
        {t.tcmb && <p className="text-sm leading-relaxed" style={{ color: PV.text }}>{t.tcmb}</p>}
        <p className="text-xs" style={{ ...MONO, color: PV.faint }}>{t.source(day(latest.end.date))}</p>
      </section>

      <p className="text-[15px]">
        <Link href={tr ? pair.tr!.pairPath : pairPath(base, target)} className="inline-flex items-center min-h-[44px] underline underline-offset-4" style={{ color: PV.accentText }}>
          {t.back}
        </Link>
      </p>
    </>
  )
}
