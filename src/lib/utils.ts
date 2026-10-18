import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Currency } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(amount)
}

// Calendar-month subtraction in UTC (all API dates are UTC calendar days).
// The day is clamped to the target month's last day, so 31 Mar − 1 month is
// 28/29 Feb rather than rolling over into 3 Mar. Returns UTC midnight.
export function subtractMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() - months
  const lastDayOfTarget = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), lastDayOfTarget)))
}

// "2026-10-17T11:59:11.000Z" -> "2026-10-17 11:59 UTC"
export function formatUtcTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  const s = new Date(ms).toISOString()
  return `${s.slice(0, 10)} ${s.slice(11, 16)} UTC`
}

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function getSparklineSampleDates(
  startDate: Date,
  endDate: Date,
  sampleCount: number
): string[] {
  const dates: string[] = []
  const totalMs = endDate.getTime() - startDate.getTime()
  for (let i = 0; i <= sampleCount; i++) {
    const d = new Date(startDate.getTime() + (totalMs * i) / sampleCount)
    dates.push(toISODate(d))
  }
  return dates
}
