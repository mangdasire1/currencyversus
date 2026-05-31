export interface Currency {
  code: string
  name: string
  flag: string
  decimals: number
}

export interface ExchangeRate {
  base: string
  date: string
  rates: Record<string, number>
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
  historicalRate: number | null
  currentRate: number | null
  percentChange: number | null
  sparklineData: HistoricalPoint[]
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}
