// Turkish text of the history table (task C3, fix 2). Pure — tested in
// history-table-tr.test.ts. The table itself is the English pages' component
// (components/pilot/PilotHistoryTable.tsx), so rows, rates and changes are
// computed once; the Turkish page hands this in, and English pages do not
// load it.

import { trNumber, trDateShort } from "./format-tr.ts"
import { trCurrencyName, TR_PERIOD_SHORT } from "./pilot-format-tr.ts"

export interface HistoryTableText {
  heading: string
  columns: readonly [period: string, then: string, usedDay: string, change: string]
  now: (label: string | null, date: string | null) => string
  period: (key: string) => string
  rate: (en: string) => string // from formatFxRate's text
  day: (iso: string) => string
  requested: (iso: string) => string // under the used day, when another was asked for
  coverage: (iso: string) => string
  direction: string
  footnote: string
}

// "1 doların", "1 euronun"
const GENITIVE: Record<string, string> = { USD: "doların", EUR: "euronun" }

const day = (iso: string) => trDateShort(iso) ?? "—"

export function trHistoryTableText(base: "USD" | "EUR", target: "TRY"): HistoryTableText {
  const from = trCurrencyName(base)
  const to = trCurrencyName(target)
  return {
    heading: `${from.replace(/^./, (c) => c.toLocaleUpperCase("tr"))}/${to}: önceki tarihlerle karşılaştırma`,
    columns: ["Dönem", "O zaman", "Kullanılan gün", "Değişim"],
    now: (label, date) => `Şimdi: ${label ?? "—"}${date ? ` (ECB referans kuru, ${day(date)})` : ""}`,
    period: (key) => TR_PERIOD_SHORT[key],
    rate: trNumber,
    day,
    requested: (iso) => `istenen: ${day(iso)}`,
    coverage: (iso) => `veri yalnızca ${day(iso)} tarihinden itibaren`,
    // directionNote (pilot-format.ts): no value judgement, only whom it helps
    direction: `Sayının yükselmesi, 1 ${GENITIVE[base]} daha çok ${to} ettiği anlamına gelir: elinde ${from} olan için iyidir, ${to} kazanan için değil.`,
    footnote:
      "“O zaman”, dönemin başladığı gün ya da ondan önceki son iş günü yayımlanan günlük ECB referans kurudur (gün içi seviye değildir). " +
      "“istenen”, hafta sonuna ya da tatile denk geldiği için kuru olmayan tarihi gösterir.",
  }
}
