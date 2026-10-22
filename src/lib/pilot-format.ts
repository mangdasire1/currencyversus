// Text helpers for the pilot pair layout. Pure — tested with `node --test`.

import { CURRENCY_MAP } from "./currencies.ts"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// "2026-10-22" → "22 Oct 2026"
export function formatBadgeDate(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  if (!m || m < 1 || m > 12) return null
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay()]
}

// Explains when the provider's business day differs from the date asked for.
// "2016-10-22 was a Saturday, so the last published business day, 2016-10-21, was used."
export function usedDayNote(requested: string, used: string | null): string | null {
  if (!used || used === requested) return null
  const dow = new Date(`${requested}T00:00:00Z`).getUTCDay()
  const why = dow === 0 || dow === 6 ? `was a ${weekdayName(requested)}` : "had no ECB publication (a holiday)"
  return `${requested} ${why}, so the last published business day, ${used}, was used.`
}

// Currency names in running text: "US dollar" / "US dollars", "Turkish lira".
const PLURAL_LAST_WORD: Record<string, string> = {
  dollar: "dollars",
  euro: "euros",
  pound: "pounds",
  yen: "yen",
  franc: "francs",
  lira: "lira",
  yuan: "yuan",
  rupee: "rupees",
  real: "reais",
  won: "won",
  krona: "kronor",
  peso: "pesos",
}

export function currencyNoun(code: string, plural = false): string {
  const name = CURRENCY_MAP[code]?.name ?? code
  const words = name.split(" ")
  const last = words.pop()!.toLowerCase()
  const head = words.join(" ")
  const noun = plural ? (PLURAL_LAST_WORD[last] ?? `${last}s`) : last
  return head ? `${head} ${noun}` : noun
}

// Rate direction carries no value judgement: say who it helps.
// "A rising number means one US dollar buys more Turkish lira — good for someone
//  holding US dollars, not for someone earning Turkish lira."
export function directionNote(base: string, target: string): string {
  return `A rising number means one ${currencyNoun(base)} buys more ${currencyNoun(target, true)} — good for someone holding ${currencyNoun(base, true)}, not for someone earning ${currencyNoun(target, true)}.`
}

// "US Dollar to Turkish Lira"
export function pairTitle(base: string, target: string): string {
  return `${CURRENCY_MAP[base]?.name ?? base} to ${CURRENCY_MAP[target]?.name ?? target}`
}
