export interface Currency {
  code: string
  name: string
  shortName: string
  flag: string
  decimals: number
}

export interface ExchangeRate {
  base: string
  date: string
  rates: Record<string, number>
  fetchedAt?: string // ISO time we retrieved it (client only)
}

export interface TimeSeriesRates {
  base: string
  start_date: string
  end_date: string
  rates: Record<string, Record<string, number>>
}

export interface HistoricalPoint {
  date: string
  rate: number
}

export interface TimePeriod {
  label: string
  key: string
  months: number
}

export interface HistoricalComparison {
  period: TimePeriod
  requestedDate: string // today − period (UTC calendar date)
  historicalDate: string | null // business day the provider actually returned
  historicalRate: number | null
  currentRate: number | null
  percentChange: number | null
  low: HistoricalPoint | null // lowest daily reference rate in the period
  high: HistoricalPoint | null // highest daily reference rate in the period
  coverageStart: string | null // set when data does not reach back to requestedDate
  sparklineData: HistoricalPoint[]
}

