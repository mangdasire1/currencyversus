// Payload validators for cached entries. A cached value is used only if it
// has the expected fields, finite positive numbers, plausible dates and —
// where it applies — the pair/metal identity the caller asked for.

import type { ExchangeRate, HistoricalPoint } from "./types.ts"

const EARLIEST_DATA = Date.UTC(1999, 0, 1) // ECB reference rates start 1999
const FUTURE_SLACK_MS = 2 * 24 * 60 * 60 * 1000

function isRate(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0
}

export function isPlausibleDate(s: unknown, now = Date.now()): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(s)) return false
  const ms = Date.parse(s)
  return Number.isFinite(ms) && ms >= EARLIEST_DATA && ms <= now + FUTURE_SLACK_MS
}

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x)
}

export function isExchangeRateFor(base: string, target: string) {
  return (x: unknown): x is ExchangeRate =>
    isObject(x) &&
    x.base === base &&
    isPlausibleDate(x.date) &&
    isObject(x.rates) &&
    isRate(x.rates[target]) &&
    (x.fetchedAt === undefined || isPlausibleDate(x.fetchedAt))
}

export interface CachedMetalPrice {
  metal: string
  price: number
  priceTime: string | null
  fetchedAt: string
}

export function isMetalPriceFor(metal: string) {
  return (x: unknown): x is CachedMetalPrice =>
    isObject(x) &&
    x.metal === metal &&
    isRate(x.price) &&
    (x.priceTime === null || isPlausibleDate(x.priceTime)) &&
    isPlausibleDate(x.fetchedAt)
}

export function isHistoricalPoints(x: unknown): x is HistoricalPoint[] {
  return (
    Array.isArray(x) &&
    x.every((p) => isObject(p) && isPlausibleDate(p.date) && isRate(p.rate))
  )
}

export interface CachedHistoryRow {
  periodKey: string
  requestedDate: string
  historicalDate: string | null
  historicalRate: number | null
  low: HistoricalPoint | null
  high: HistoricalPoint | null
  coverageStart: string | null
  sparklineData: HistoricalPoint[]
}

function isPointOrNull(x: unknown): x is HistoricalPoint | null {
  return x === null || (isObject(x) && isPlausibleDate(x.date) && isRate(x.rate))
}

function isCachedHistoryRow(x: unknown): x is CachedHistoryRow {
  if (!isObject(x) || typeof x.periodKey !== "string" || !isPlausibleDate(x.requestedDate)) return false
  // A row is either complete (rate + date) or explicitly empty (both null).
  const complete = isRate(x.historicalRate) && isPlausibleDate(x.historicalDate)
  const empty = x.historicalRate === null && x.historicalDate === null
  const coverageOk = x.coverageStart === null || isPlausibleDate(x.coverageStart)
  return (complete || empty) && coverageOk && isPointOrNull(x.low) && isPointOrNull(x.high) && isHistoricalPoints(x.sparklineData)
}

export function isCachedHistory(x: unknown): x is CachedHistoryRow[] {
  return Array.isArray(x) && x.length > 0 && x.every(isCachedHistoryRow)
}
