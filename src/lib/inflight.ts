// In-flight request deduplication. Identical concurrent requests share one
// underlying fetch. Each caller keeps its own AbortSignal: a caller that
// aborts stops waiting immediately, and the shared fetch is aborted only when
// every caller has gone.

interface Entry {
  promise: Promise<unknown>
  controller: AbortController
  refs: number
}

const inflight = new Map<string, Entry>()

// Number of underlying requests actually started (for tests / diagnostics).
export const requestStats = { started: 0 }

function abortError(): Error {
  return new DOMException("The operation was aborted.", "AbortError")
}

export function sharedRequest<T>(
  key: string,
  run: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError())

  let entry = inflight.get(key)
  if (!entry) {
    const controller = new AbortController()
    const created: Entry = { promise: Promise.resolve(), controller, refs: 0 }
    created.promise = run(controller.signal).finally(() => {
      if (inflight.get(key) === created) inflight.delete(key)
    })
    inflight.set(key, created)
    requestStats.started++
    entry = created
  }
  const e = entry
  e.refs++

  return new Promise<T>((resolve, reject) => {
    let settled = false
    const onAbort = () => {
      if (settled) return
      settled = true
      e.refs--
      if (e.refs === 0) {
        e.controller.abort()
        if (inflight.get(key) === e) inflight.delete(key)
      }
      reject(abortError())
    }
    signal?.addEventListener("abort", onAbort, { once: true })
    e.promise.then(
      (value) => {
        if (settled) return
        settled = true
        e.refs--
        signal?.removeEventListener("abort", onAbort)
        resolve(value as T)
      },
      (err) => {
        if (settled) return
        settled = true
        e.refs--
        signal?.removeEventListener("abort", onAbort)
        reject(err)
      }
    )
  })
}
