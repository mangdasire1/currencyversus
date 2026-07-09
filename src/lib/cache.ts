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
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl }
  const value = JSON.stringify(entry)
  try {
    localStorage.setItem(`cv_${key}`, value)
  } catch {
    // Quota exceeded — purge expired entries and retry once
    cachePurgeExpired()
    try {
      localStorage.setItem(`cv_${key}`, value)
    } catch {
      // Still no space — skip caching
    }
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

export function cachePurgeExpired(): void {
  if (typeof window === "undefined") return
  try {
    const now = Date.now()
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith("cv_")) continue
      try {
        const entry = JSON.parse(localStorage.getItem(key) ?? "") as CacheEntry<unknown>
        if (now - entry.timestamp > entry.ttl) toRemove.push(key)
      } catch {
        toRemove.push(key)
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // localStorage unavailable — skip silently
  }
}
