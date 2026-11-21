// Turkish display formatting (task C3-2). Pure — tested in format-tr.test.ts.
// Every figure on a Turkish page passes through this module; nothing on an
// English page does (scripts/verify-locale.mjs checks the built pages).
//
// Numbers: the site's English formatters decide the rounding (format.ts,
// metal-units.ts: raw precision kept, decimals by the same rules); this module
// only changes the separators, so a Turkish figure always has exactly the
// decimals of the English page:
//   "4,962.80" → "4.962,80"    "49.6280" → "49,6280"    "<0.0001" → "<0,0001"
//
// Dates — one rule for each kind of place:
//   running text (sentences, notes, captions)  → trDateLong:  "21 Kasım 2026"
//   tables, chart axes, compact labels, badges → trDateShort: "21.11.2026"
//
// Currency after the number, as written in Turkish: "4.962,80 TL",
// "3.842,27 $", "1.234,56 €"; other currencies by ISO code ("12,34 GBP").
// TRY is shown as "TL" (the method page explains the ISO code TRY).

const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]

// A number as the English formatters print it: optional sign or "<"/">",
// digits with "," thousands and "." decimals. "—" (no value) passes through.
const EN_NUMBER = /^[<>+\-−~]*\d{1,3}(,\d{3})*(\.\d+)?$|^[<>+\-−~]*\d+(\.\d+)?$/

export function trNumber(en: string): string {
  if (en === "—") return en
  if (!EN_NUMBER.test(en)) throw new Error(`trNumber: not an English-formatted number: ${JSON.stringify(en)}`)
  return en.replace(/[.,]/g, (c) => (c === "," ? "." : ","))
}

const SYMBOL: Record<string, string> = { TRY: "TL", USD: "$", EUR: "€" }

// Currency label used after a Turkish figure: "TL", "$", "€" or the ISO code.
export function trCurrency(code: string): string {
  return SYMBOL[code] ?? code
}

// "4,962.80" + TRY → "4.962,80 TL"
export function trMoney(en: string, code: string): string {
  return en === "—" ? en : `${trNumber(en)} ${trCurrency(code)}`
}

// Percent sign before the number, as in Turkish ("%5"); the sign of a change
// stays in front: "+60.07%" → "+%60,07", "-5.10%" → "-%5,10", "~0%" → "~%0".
// Takes the text of formatPercentChange (format.ts): same rounding, same
// "~0%" threshold as the English pages.
export function trPercent(en: string): string {
  if (en === "—") return en
  const m = /^([+\-−~]?)(\d+(?:\.\d+)?)%$/.exec(en)
  if (!m) throw new Error(`trPercent: not an English percentage: ${JSON.stringify(en)}`)
  return `${m[1]}%${trNumber(m[2])}`
}

function parts(iso: string | null | undefined): [number, number, number] | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return [y, m, d]
}

// Running text: "2026-11-21" → "21 Kasım 2026"
export function trDateLong(iso: string | null | undefined): string | null {
  const p = parts(iso)
  return p ? `${p[2]} ${MONTHS_TR[p[1] - 1]} ${p[0]}` : null
}

// Tables and compact places: "2026-11-21" → "21.11.2026"
export function trDateShort(iso: string | null | undefined): string | null {
  const p = parts(iso)
  return p ? `${String(p[2]).padStart(2, "0")}.${String(p[1]).padStart(2, "0")}.${p[0]}` : null
}

// Provider time (compact): "2026-11-21T13:59:11Z" → "21.11.2026 13:59 UTC".
// Kept in UTC, as on the English pages: no conversion to Turkish time.
export function trUtcTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  const s = new Date(ms).toISOString()
  return `${trDateShort(s)} ${s.slice(11, 16)} UTC`
}

// Month and year (chart ranges): "2016-11" or "2016-11-21" → "Kasım 2016"
export function trMonthYear(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}/.test(iso)) return null
  const m = Number(iso.slice(5, 7))
  return m >= 1 && m <= 12 ? `${MONTHS_TR[m - 1]} ${iso.slice(0, 4)}` : null
}
