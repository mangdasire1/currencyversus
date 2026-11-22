// The one way the browser asks a provider for data (http.test.ts checks that
// no other client code calls fetch). A request gets 10 s for the whole answer,
// body included; after that it fails like any other error: saved data with
// the warning, and the wait before the next try (backoff.ts).
//
// Not AbortSignal.timeout + AbortSignal.any: the latter needs Safari 17.4 and
// the site supports 16.4.

export const REQUEST_TIMEOUT_MS = 10_000

export class RequestTimeoutError extends Error {
  constructor() {
    super("the provider did not answer in time")
    // not "AbortError": callers ignore that one, it means they left
    this.name = "TimeoutError"
  }
}

export async function getJson<T>(url: string, label: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const leave = () => controller.abort(signal?.reason)
  if (signal?.aborted) leave()
  else signal?.addEventListener("abort", leave, { once: true })

  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new RequestTimeoutError()
      reject(err)
      controller.abort(err) // and drop the connection
    }, REQUEST_TIMEOUT_MS)
  })
  const answer = (async () => {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`${label}: ${res.status}`)
    return (await res.json()) as T
  })()

  try {
    return await Promise.race([answer, deadline])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", leave)
  }
}
