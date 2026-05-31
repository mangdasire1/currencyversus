import type { CacheEntry } from "./types"

const TTL = {
  latest: 60 * 60 * 1000,           // 1 hour
  shortHistory: 12 * 60 * 60 * 1000, // 12 hours (1m–6m)
  longHistory: 24 * 60 * 60 * 1000,  // 24 hours (1y–10y)
}

export function getCacheTTL(periodKey: string): number {
  const short = ["1m", "3m", "6m"]
  return short.includes(periodKey) ? TTL.shortHistory : TTL.longHistory
}

export function cacheGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`cv_${key}`)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.timestamp > entry.ttl) return null
    return entry.data
  } catch {
    return null
  }
}

export function cacheSet<T>(key: string, data: T, ttl: number): void {
  if (typeof window === "undefined") return
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl }
    localStorage.setItem(`cv_${key}`, JSON.stringify(entry))
  } catch {
    // localStorage quota exceeded — skip caching
  }
}

export function cacheGetStale<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`cv_${key}`)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    return entry.data
  } catch {
    return null
  }
}
