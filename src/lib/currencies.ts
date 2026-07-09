import type { Currency, TimePeriod } from "./types"

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar",          shortName: "Dollar",  flag: "🇺🇸", decimals: 2 },
  { code: "EUR", name: "Euro",               shortName: "Euro",    flag: "🇪🇺", decimals: 2 },
  { code: "GBP", name: "British Pound",      shortName: "Pound",   flag: "🇬🇧", decimals: 2 },
  { code: "JPY", name: "Japanese Yen",       shortName: "Yen",     flag: "🇯🇵", decimals: 0 },
  { code: "CHF", name: "Swiss Franc",        shortName: "Franc",   flag: "🇨🇭", decimals: 2 },
  { code: "CAD", name: "Canadian Dollar",    shortName: "Dollar",  flag: "🇨🇦", decimals: 2 },
  { code: "AUD", name: "Australian Dollar",  shortName: "Dollar",  flag: "🇦🇺", decimals: 2 },
  { code: "TRY", name: "Turkish Lira",       shortName: "Lira",    flag: "🇹🇷", decimals: 2 },
  { code: "CNY", name: "Chinese Yuan",       shortName: "Yuan",    flag: "🇨🇳", decimals: 2 },
  { code: "INR", name: "Indian Rupee",       shortName: "Rupee",   flag: "🇮🇳", decimals: 2 },
  { code: "BRL", name: "Brazilian Real",     shortName: "Real",    flag: "🇧🇷", decimals: 2 },
  { code: "KRW", name: "South Korean Won",   shortName: "Won",     flag: "🇰🇷", decimals: 0 },
  { code: "SEK", name: "Swedish Krona",      shortName: "Krona",   flag: "🇸🇪", decimals: 2 },
  { code: "MXN", name: "Mexican Peso",       shortName: "Peso",    flag: "🇲🇽", decimals: 2 },
  { code: "SGD", name: "Singapore Dollar",   shortName: "Dollar",  flag: "🇸🇬", decimals: 2 },
]

export const CURRENCY_MAP = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
) as Record<string, Currency>

export const TIME_PERIODS: TimePeriod[] = [
  { label: "1 Month",  key: "1m",  months: 1   },
  { label: "3 Months", key: "3m",  months: 3   },
  { label: "6 Months", key: "6m",  months: 6   },
  { label: "1 Year",   key: "1y",  months: 12  },
  { label: "3 Years",  key: "3y",  months: 36  },
  { label: "5 Years",  key: "5y",  months: 60  },
  { label: "10 Years", key: "10y", months: 120 },
]
