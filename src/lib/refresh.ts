// Keeps an open tab's data current. Pure scheduling logic with injectable
// clock/visibility, so it is tested with node:test fake timers.
//
// - check() is the first check. In a hidden tab it waits until the tab is seen.
// - While the tab is visible, a check is scheduled for the moment the current
//   data passes its fresh TTL; at that point the caller's refresh runs. After
//   a failure the moment is the end of the wait instead (backoff.ts): the
//   data's age does not change when a request fails, so scheduling by age
//   alone would retry at once, forever.
// - While hidden, no timer runs and no automatic request is made.
// - When the tab becomes visible again it picks up where it was: what fell due
//   runs at once, otherwise the rest of the TTL or of the wait is waited out.
// - refreshNow() runs a forced refresh (bypassing a fresh cache and a wait).
//
// A TTL by itself never triggers a request; this scheduler is what turns
// "the data is now stale" into an actual provider request.

export interface VisibilitySource {
  isVisible(): boolean
  subscribe(onChange: () => void): () => void
}

// Two automatic runs are never closer than this, whatever the refresh did.
const MIN_GAP_MS = 1000

export interface AutoRefreshOptions {
  freshTtlMs: number
  // When the data currently shown was fetched (ms since epoch), or null if
  // unknown/none (then a check is scheduled one TTL after the last one).
  getFetchedAt: () => number | null
  // End of the wait after a failed request; null while nothing is failing.
  retryAt: () => number | null
  refresh: (opts: { force: boolean }) => Promise<unknown> | unknown
  visibility: VisibilitySource
  now?: () => number
}

export interface AutoRefresh {
  check(): Promise<void>
  refreshNow(): Promise<void>
  reschedule(): void // call after the data (and its fetchedAt) changed
  stop(): void
}

export function documentVisibility(): VisibilitySource {
  return {
    isVisible: () => typeof document === "undefined" || document.visibilityState === "visible",
    subscribe: (onChange) => {
      if (typeof document === "undefined") return () => {}
      document.addEventListener("visibilitychange", onChange)
      return () => document.removeEventListener("visibilitychange", onChange)
    },
  }
}

// For one-off background loads (history, chart): runs now in a visible tab,
// in a hidden one when it is first seen. Returns a cancel function.
export function whenVisible(visibility: VisibilitySource, run: () => void): () => void {
  if (visibility.isVisible()) {
    run()
    return () => {}
  }
  let waiting = true
  const unsubscribe = visibility.subscribe(() => {
    if (!waiting || !visibility.isVisible()) return
    waiting = false
    unsubscribe()
    run()
  })
  return () => {
    waiting = false
    unsubscribe()
  }
}

export function startAutoRefresh(o: AutoRefreshOptions): AutoRefresh {
  const now = o.now ?? (() => Date.now())
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight = false
  let stopped = false
  let checkPending = false
  let lastRunEnd: number | null = null

  const clear = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  const dueIn = (): number => {
    const retry = o.retryAt()
    let at: number
    if (retry !== null) at = retry
    else {
      const since = o.getFetchedAt() ?? lastRunEnd
      at = (since ?? now()) + o.freshTtlMs
    }
    if (lastRunEnd !== null) at = Math.max(at, lastRunEnd + MIN_GAP_MS)
    return Math.max(0, at - now())
  }

  const run = async (force: boolean) => {
    if (stopped || inFlight) return
    if (!force && !o.visibility.isVisible()) return
    checkPending = false
    inFlight = true
    clear()
    try {
      await o.refresh({ force })
    } catch {
      // the caller handles/surfaces errors; scheduling continues
    } finally {
      inFlight = false
      lastRunEnd = now()
      schedule()
    }
  }

  function schedule() {
    clear()
    if (stopped || inFlight || !o.visibility.isVisible()) return
    timer = setTimeout(() => {
      timer = null
      void run(false)
    }, dueIn())
  }

  const onVisibility = () => {
    if (!o.visibility.isVisible()) {
      clear() // hidden: no timers, no requests
      return
    }
    if (checkPending || dueIn() === 0) void run(false)
    else schedule()
  }

  const unsubscribe = o.visibility.subscribe(onVisibility)
  schedule()

  return {
    check: () => {
      checkPending = true
      return run(false)
    },
    refreshNow: () => run(true),
    reschedule: schedule,
    stop: () => {
      stopped = true
      clear()
      unsubscribe()
    },
  }
}
