// How long to wait after a failed request for current data. Kept per resource
// (one pair's rate, one metal's price) for the whole tab, not per component:
// several surfaces showing one resource, a remount or a client navigation must
// not multiply the requests. In memory, so a reload starts clean.
//
// - failures in a row wait 30 s, 1, 2, then 5 minutes (and stay at 5);
// - a success, from this tab or found in the cache, ends the wait;
// - a manual "Refresh" is never held back, and its failure neither lengthens
//   nor shortens a wait that is running.
// So automatic checks send at most 2 requests per resource in any minute.

export const RETRY_DELAYS_MS: readonly number[] = [30_000, 60_000, 120_000, 300_000]

interface Failure {
  attempts: number
  failedAt: number
  retryAt: number
}

const failures = new Map<string, Failure>()

// When the next automatic request may go out; null while nothing is failing.
export function retryAt(key: string): number | null {
  return failures.get(key)?.retryAt ?? null
}

// Thrown instead of sending an automatic request during a wait. Callers treat
// it like the failure that started the wait (saved data, with the warning).
export class RetryWaitError extends Error {
  constructor() {
    super("waiting to retry after a failed request")
    this.name = "RetryWaitError"
  }
}

export function assertMayRequest(key: string): void {
  const at = retryAt(key)
  if (at !== null && Date.now() < at) throw new RetryWaitError()
}

// A fresh cache entry stands in for a request, except after a failure: then
// only one written since (another tab succeeded) does, and it ends the wait.
export function acceptCached(key: string, fetchedAt: string | null | undefined): boolean {
  const f = failures.get(key)
  if (!f) return true
  if (!fetchedAt || !(Date.parse(fetchedAt) > f.failedAt)) return false
  failures.delete(key)
  return true
}

// Runs one provider request and records how it ended.
export async function tracked<T>(key: string, request: () => Promise<T>): Promise<T> {
  try {
    const result = await request()
    failures.delete(key)
    return result
  } catch (err) {
    // a request dropped because every caller left (a navigation) did not fail
    if (err instanceof Error && err.name === "AbortError") throw err
    const now = Date.now()
    const before = failures.get(key)
    if (before && now < before.retryAt) before.failedAt = now // a manual try during the wait
    else {
      const attempts = (before?.attempts ?? 0) + 1
      const delay = RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length) - 1]
      failures.set(key, { attempts, failedAt: now, retryAt: now + delay })
    }
    throw err
  }
}

// For tests: the state is module-wide.
export function resetBackoff(): void {
  failures.clear()
}
