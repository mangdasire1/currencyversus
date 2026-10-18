// Production freshness checks for build-info.json (pure — tested with
// `node --test`, run daily by .github/workflows/production-monitor.yml).
//
// Two different ages, kept apart on purpose:
//   - build input age: how old the data was when the build fetched it
//     (bounded by build-data.ts's fetch-cache lifetime);
//   - published HTML age: how long that build has been live. A static export
//     does not change until the next successful build + deploy, so this is
//     what can silently grow and what this monitor watches.

export interface BuildInfo {
  buildTime: string // ISO — when the build ran
  commit: string | null // commit the build was made from
  branch: string | null
  fx: { pair: string; date: string | null } // embedded ECB rate (publication date)
  metals: Record<string, { priceTime: string | null } | null> // provider's update time
}

// ECB reference rates are published on TARGET2 business days: not on
// weekends, New Year's Day, Good Friday, Easter Monday, 1 May, 25 and 26 Dec.
function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

export function ecbHolidays(year: number): Set<string> {
  const easter = easterSunday(year)
  const goodFriday = new Date(easter); goodFriday.setUTCDate(easter.getUTCDate() - 2)
  const easterMonday = new Date(easter); easterMonday.setUTCDate(easter.getUTCDate() + 1)
  return new Set([`${year}-01-01`, iso(goodFriday), iso(easterMonday), `${year}-05-01`, `${year}-12-25`, `${year}-12-26`])
}

export function isEcbPublicationDay(day: string): boolean {
  const d = new Date(`${day}T00:00:00Z`)
  const dow = d.getUTCDay()
  return dow !== 0 && dow !== 6 && !ecbHolidays(d.getUTCFullYear()).has(day)
}

// ECB publishes around 16:00 CET (14:00–15:00 UTC); a day's publication is
// only "expected" from 17:00 UTC on, leaving room for publication delays.
export const EXPECTED_PUBLICATION_UTC_HOUR = 17

// Number of ECB publications that should exist after `fxDate` but are not in
// the build. Weekends and holidays are not counted.
export function missedEcbPublications(fxDate: string, now: Date): number {
  let missed = 0
  const d = new Date(`${fxDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  const today = iso(now)
  while (iso(d) <= today) {
    const day = iso(d)
    const published = day < today || now.getUTCHours() >= EXPECTED_PUBLICATION_UTC_HOUR
    if (published && isEcbPublicationDay(day)) missed++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return missed
}

export interface CheckOptions {
  now: Date
  expectedCommit: string | null // HEAD of main
  expectedCommitTime: Date | null // when that commit was made
  maxMissedFx?: number // tolerated missed ECB publications (default 1)
  deployGraceMs?: number // time allowed for a new commit to go live (default 3 h)
  maxBuildAgeMs?: number // published HTML age limit (default 4 days)
  maxMetalLagMs?: number // metal price time vs build time (default 3 days)
}

export interface CheckResult {
  failures: string[]
  notes: string[]
}

const H = 3_600_000

export function checkBuildInfo(info: BuildInfo, o: CheckOptions): CheckResult {
  const failures: string[] = []
  const notes: string[] = []
  const maxMissed = o.maxMissedFx ?? 1
  const grace = o.deployGraceMs ?? 3 * H
  const maxBuildAge = o.maxBuildAgeMs ?? 4 * 24 * H
  const maxMetalLag = o.maxMetalLagMs ?? 3 * 24 * H

  // 1. Is the live build the latest commit on main?
  if (o.expectedCommit) {
    if (info.commit === o.expectedCommit) {
      notes.push(`live build is main HEAD ${o.expectedCommit.slice(0, 7)}`)
    } else {
      const sinceCommit = o.expectedCommitTime ? o.now.getTime() - o.expectedCommitTime.getTime() : Infinity
      const msg = `live build ${info.commit?.slice(0, 7) ?? "unknown"} is not main HEAD ${o.expectedCommit.slice(0, 7)}`
      if (sinceCommit <= grace) notes.push(`${msg} (HEAD is ${Math.round(sinceCommit / 60000)} min old — within deploy grace)`)
      else failures.push(msg)
    }
  }

  // 2. Published HTML age (how long this build has been live).
  const buildAge = o.now.getTime() - Date.parse(info.buildTime)
  if (!Number.isFinite(buildAge)) failures.push(`buildTime is not a valid date: ${info.buildTime}`)
  else if (buildAge > maxBuildAge) failures.push(`published build is ${(buildAge / H).toFixed(1)} h old (limit ${maxBuildAge / H} h)`)
  else notes.push(`published build age ${(buildAge / H).toFixed(1)} h`)

  // 3. Embedded ECB rate: missed publications, weekends/holidays excluded.
  if (!info.fx.date) {
    failures.push("no embedded FX date (build-time FX fetch failed)")
  } else {
    const missed = missedEcbPublications(info.fx.date, o.now)
    const msg = `embedded ECB date ${info.fx.date}: ${missed} newer ECB publication(s) missing (tolerance ${maxMissed})`
    if (missed > maxMissed) failures.push(msg)
    else notes.push(msg)
  }

  // 4. Embedded metal prices: provider time close to the build time.
  for (const [metal, m] of Object.entries(info.metals)) {
    if (!m || !m.priceTime) {
      failures.push(`no embedded ${metal} price time`)
      continue
    }
    const lag = Date.parse(info.buildTime) - Date.parse(m.priceTime)
    if (lag > maxMetalLag) failures.push(`${metal} price time ${m.priceTime} is ${(lag / H).toFixed(1)} h older than the build`)
    else notes.push(`${metal} price time ${m.priceTime}`)
  }

  return { failures, notes }
}
