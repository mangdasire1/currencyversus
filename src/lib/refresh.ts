// Keeps an open tab's data current. Pure scheduling logic with injectable
// clock/visibility, so it is tested with node:test fake timers.
//
// - While the tab is visible, a check is scheduled for the moment the current
//   data passes its fresh TTL; at that point the caller's refresh runs.
// - While hidden, no timer runs and no request is made.
// - When the tab becomes visible again, data older than the fresh TTL is
//   refreshed immediately.
// - refreshNow() runs a forced refresh (bypassing a fresh cache).
//
// A TTL by itself never triggers a request; this scheduler is what turns
// "the data is now stale" into an actual provider request.

export interface VisibilitySource {
  isVisible(): boolean
  subscribe(onChange: () => void): () => void
}

export interface AutoRefreshOptions {
  freshTtlMs: number
  // When the data currently shown was fetched (ms since epoch), or null if
  // unknown/none (then a check is scheduled one TTL from now).
  getFetchedAt: () => number | null
  refresh: (opts: { force: boolean }) => Promise<unknown> | unknown
  visibility: VisibilitySource
  now?: () => number
}

export interface AutoRefresh {
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

export function startAutoRefresh(o: AutoRefreshOptions): AutoRefresh {
  const now = o.now ?? (() => Date.now())
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight = false
  let stopped = false

  const clear = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  const ageMs = (): number | null => {
    const t = o.getFetchedAt()
    return t === null ? null : now() - t
  }

  const run = async (force: boolean) => {
    if (stopped || inFlight) return
    inFlight = true
    clear()
    try {
      await o.refresh({ force })
    } catch {
      // the caller handles/surfaces errors; scheduling continues
    } finally {
      inFlight = false
      schedule()
    }
  }

  function schedule() {
    clear()
    if (stopped || inFlight || !o.visibility.isVisible()) return
    const age = ageMs()
    const delay = age === null ? o.freshTtlMs : Math.max(0, o.freshTtlMs - age)
    timer = setTimeout(() => {
      timer = null
      void run(false)
    }, delay)
  }

  const onVisibility = () => {
    if (!o.visibility.isVisible()) {
      clear() // hidden: no timers, no requests
      return
    }
    const age = ageMs()
    if (age !== null && age >= o.freshTtlMs) void run(false)
    else schedule()
  }

  const unsubscribe = o.visibility.subscribe(onVisibility)
  schedule()

  return {
    refreshNow: () => run(true),
    reschedule: schedule,
    stop: () => {
      stopped = true
      clear()
      unsubscribe()
    },
  }
}
