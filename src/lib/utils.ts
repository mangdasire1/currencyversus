import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Currency } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRate(rate: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(rate)
}

export function formatAmount(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(amount)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() - months)
  return result
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
