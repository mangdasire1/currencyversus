// localStorage cache with two lifetimes per entry:
//   freshTtl     — within this age the entry is current and replaces a fetch
//   retentionTtl — until this age it is kept as a fallback for when the API
//                  is unreachable; after it the entry is purged
// Every read is validated: the envelope (timestamps, TTLs) and the payload
// (via a caller-supplied schema check). localStorage is user-editable and may
// hold entries from older app versions, so anything malformed is dropped.

export type CacheKind = "fx" | "history" | "metal"

const RETENTION_FACTOR = 10
const RETENTION_CAP: Record<CacheKind, number> = {
  fx: 7 * 24 * 60 * 60 * 1000, // 7 days
  history: 7 * 24 * 60 * 60 * 1000, // 7 days (FX data)
  metal: 24 * 60 * 60 * 1000, // 24 hours
}
const CLOCK_SKEW_MS = 5 * 60 * 1000

export const FRESH_TTL = {
  latest: 60 * 60 * 1000, // 1 hour
  shortHistory: 12 * 60 * 60 * 1000, // 12 hours (all periods share one series)
  longHistory: 24 * 60 * 60 * 1000, // 24 hours
  metal: 15 * 60 * 1000, // 15 min — metals are more volatile than FX
}

export function retentionFor(freshTtl: number, kind: CacheKind): number {
  return Math.max(freshTtl, Math.min(freshTtl * RETENTION_FACTOR, RETENTION_CAP[kind]))
}

export interface CacheEntry<T> {
  data: T
  timestamp: number // when stored (ms since epoch)
  freshTtl: number
  retentionTtl: number
}

export type Validator<T> = (data: unknown) => data is T

export interface StaleHit<T> {
  data: T
  ageMs: number
}

const PREFIX = "cv_"

function storage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0
}

// Envelope check. Rejects old-format entries ({ ttl }), corrupted JSON,
// non-finite numbers and timestamps from the future.
export function parseEnvelope(raw: string | null, now: number): CacheEntry<unknown> | null {
  if (!raw) return null
  let entry: unknown
  try {
    entry = JSON.parse(raw)
  } catch {
    return null
  }
  if (!entry || typeof entry !== "object") return null
  const e = entry as Partial<CacheEntry<unknown>>
  if (!isPositiveFinite(e.timestamp) || e.timestamp > now + CLOCK_SKEW_MS) return null
  if (!isPositiveFinite(e.freshTtl) || !isPositiveFinite(e.retentionTtl)) return null
  if (e.retentionTtl < e.freshTtl) return null
  if (!("data" in e)) return null
  return e as CacheEntry<unknown>
}

function read<T>(key: string, validate: Validator<T>): { entry: CacheEntry<T>; ageMs: number } | null {
  const ls = storage()
  if (!ls) return null
  const now = Date.now()
  try {
    const entry = parseEnvelope(ls.getItem(PREFIX + key), now)
    if (!entry || !validate(entry.data)) {
      ls.removeItem(PREFIX + key) // malformed or old schema: drop silently
      return null
    }
    const ageMs = Math.max(0, now - entry.timestamp)
    if (ageMs > entry.retentionTtl) {
      ls.removeItem(PREFIX + key)
      return null
    }
    return { entry: entry as CacheEntry<T>, ageMs }
  } catch {
    return null
  }
}

// Fresh entries only.
export function cacheGet<T>(key: string, validate: Validator<T>): T | null {
  const hit = read(key, validate)
  return hit && hit.ageMs <= hit.entry.freshTtl ? hit.entry.data : null
}

// Any retained entry (fresh or past fresh), with its age, for fallback use.
export function cacheGetStale<T>(key: string, validate: Validator<T>): StaleHit<T> | null {
  const hit = read(key, validate)
  return hit ? { data: hit.entry.data, ageMs: hit.ageMs } : null
}

export function cacheSet<T>(key: string, data: T, freshTtl: number, kind: CacheKind): void {
  const ls = storage()
  if (!ls) return
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    freshTtl,
    retentionTtl: retentionFor(freshTtl, kind),
  }
  const value = JSON.stringify(entry)
  try {
    ls.setItem(PREFIX + key, value)
  } catch {
    // Quota exceeded — purge expired entries and retry once
    cachePurgeExpired()
    try {
      ls.setItem(PREFIX + key, value)
    } catch {
      // Still no space — skip caching
    }
  }
}

// Removes entries past their retention window and malformed/old-format ones.
// Entries past freshTtl but within retention are kept: they are the fallback.
export function cachePurgeExpired(): void {
  const ls = storage()
  if (!ls) return
  try {
    const now = Date.now()
    const toRemove: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i)
      if (!key?.startsWith(PREFIX)) continue
      const entry = parseEnvelope(ls.getItem(key), now)
      if (!entry || now - entry.timestamp > entry.retentionTtl) toRemove.push(key)
    }
    toRemove.forEach((k) => ls.removeItem(k))
  } catch {
    // localStorage unavailable — skip silently
  }
}
