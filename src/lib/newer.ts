// Build data or browser data: the newer one is shown. "Newer" is the data's
// own time, not when it was stored or fetched:
//   rate     the ECB date
//   metal    the provider's time (when it gave none: when it was fetched,
//            which is the latest the price can be from)
//   history  the day the periods are counted from. No single row tells it:
//            one month before 29, 30 and 31 March is 28 February each time,
//            so the requested dates of all periods are added up, which grows
//            with that day.
// A page never goes back in time: not to an older cache entry, fresh or not,
// and not to an older answer from the network. On a tie, or when a time is
// unknown, the candidate (the more recently obtained value) is shown.

type TimeOf<T> = (value: T) => number // ms; NaN when unknown

export const rateTime = (r: { date: string }): number => Date.parse(r.date)
export const metalTime = (m: { priceTime: string | null; fetchedAt: string | null }): number => Date.parse(m.priceTime ?? m.fetchedAt ?? "")
export const historyTime = (rows: readonly { requestedDate: string }[]): number =>
  rows.length ? rows.reduce((sum, r) => sum + Date.parse(r.requestedDate), 0) : NaN

function isNewer<T>(a: T, b: T, timeOf: TimeOf<T>): boolean {
  return timeOf(a) > timeOf(b) // false when either is unknown
}

// The candidate, unless something already held is strictly newer.
export function newest<T>(candidate: T, held: readonly (T | null | undefined)[], timeOf: TimeOf<T>): T {
  let best = candidate
  for (const h of held) if (h && isNewer(h, best, timeOf)) best = h
  return best
}
