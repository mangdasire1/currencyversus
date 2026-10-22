// IndexNow notifications for pages whose content really changed.
// Pure — tested with `node --test`; used by scripts/indexnow.mjs, which the
// production monitor runs after it has verified the live deploy.
//
// Protocol (https://www.indexnow.org/documentation, /faq):
//   POST https://api.indexnow.org/indexnow   (global endpoint; shared with
//   all participating engines — Bing, Yandex, Seznam, Naver, …; not Google)
//   Content-Type: application/json; charset=utf-8
//   { host, key, keyLocation?, urlList }  — at most 10,000 URLs per request
//   key: 8–128 chars [a-zA-Z0-9-]; key file at https://<host>/<key>.txt
//
// Which URLs: the live sitemap already knows. Since Phase 5 a URL's
// <lastmod> moves to the build date only when its visible content changed,
// and is omitted when no reliable date exists. So: submit URLs whose live
// lastmod is today or yesterday (UTC); if none carry lastmod, submit nothing.
// Yesterday is included because the monitor runs at a fixed UTC hour: a
// deploy that goes live after it would otherwise never be notified once the
// date rolls over. Re-notifying a URL is harmless; missing one is not.

import { checkBuildInfo } from "./freshness.ts"
import type { BuildInfo } from "./freshness.ts"

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"

// Not a secret: IndexNow keys are public by design — the key file at the
// site root (public/<key>.txt) proves ownership. src/lib/indexnow.test.ts
// checks that the file exists and holds exactly this key.
export const INDEXNOW_KEY = "9a5dced82239c179ebddb9fbd6ccc16c"
export const MAX_URLS_PER_REQUEST = 10_000
const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/

export interface SitemapEntry {
  loc: string
  lastmod: string | null
}

export function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = []
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1]
    if (!loc) continue
    const lastmod = m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1] ?? null
    entries.push({ loc, lastmod })
  }
  return entries
}

export interface Selection {
  urls: string[] // lastmod is today or yesterday and the URL belongs to host
  withLastmod: number // entries that carry any lastmod
  foreign: string[] // recent lastmod but on another host — never submitted
}

// lastmod may be a date (YYYY-MM-DD) or a W3C datetime; only its date counts.
// [today, yesterday] as YYYY-MM-DD (UTC calendar days).
export function recentDays(today: string): [string, string] {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return [today, d.toISOString().slice(0, 10)]
}

export function selectChangedUrls(entries: SitemapEntry[], today: string, host: string): Selection {
  const days = recentDays(today)
  const urls: string[] = []
  const foreign: string[] = []
  let withLastmod = 0
  for (const e of entries) {
    if (!e.lastmod) continue
    withLastmod++
    if (!days.includes(e.lastmod.slice(0, 10))) continue
    let urlHost: string | null = null
    try {
      const u = new URL(e.loc)
      urlHost = u.protocol === "https:" || u.protocol === "http:" ? u.host : null
    } catch {
      urlHost = null
    }
    if (urlHost === host) urls.push(e.loc)
    else foreign.push(e.loc)
  }
  return { urls: [...new Set(urls)], withLastmod, foreign }
}

export interface IndexNowPayload {
  host: string
  key: string
  keyLocation: string
  urlList: string[]
}

export function buildPayloads(host: string, key: string, urls: string[]): IndexNowPayload[] {
  if (!KEY_PATTERN.test(key)) throw new Error("IndexNow key must be 8–128 characters of a-z, A-Z, 0-9 or '-'")
  const keyLocation = `https://${host}/${key}.txt`
  const payloads: IndexNowPayload[] = []
  for (let i = 0; i < urls.length; i += MAX_URLS_PER_REQUEST) {
    payloads.push({ host, key, keyLocation, urlList: urls.slice(i, i + MAX_URLS_PER_REQUEST) })
  }
  return payloads
}

export type Outcome =
  | "accepted" // 200
  | "pending-key-verification" // 202: not a failure; engines verify the key file first
  | "rate-limited" // 429: stop for today, do not fail the workflow
  | "error" // 400 / 403 / 405 / 422 / anything else: fail so GitHub notifies

export function classifyResponse(status: number): Outcome {
  if (status === 200) return "accepted"
  if (status === 202) return "pending-key-verification"
  if (status === 429) return "rate-limited"
  return "error"
}

export interface PlanInput {
  deployVerified: boolean // live build-info.json is main HEAD and passed the freshness checks
  sitemapXml: string | null // live sitemap, null if it could not be fetched
  today: string // YYYY-MM-DD (UTC)
  host: string
  key: string
}

export type Plan =
  | { action: "skip"; reason: string }
  | { action: "submit"; endpoint: string; payloads: IndexNowPayload[]; selection: Selection }

// The order matters: without a verified deploy nothing else is even looked at.
export function planSubmission(input: PlanInput): Plan {
  if (!input.deployVerified) {
    return { action: "skip", reason: "live deploy not verified as main HEAD — nothing is submitted" }
  }
  if (input.sitemapXml === null) {
    return { action: "skip", reason: "live sitemap.xml could not be read — nothing is submitted" }
  }
  const selection = selectChangedUrls(parseSitemap(input.sitemapXml), input.today, input.host)
  if (selection.withLastmod === 0) {
    return { action: "skip", reason: "no URL in the live sitemap carries lastmod (dates not yet known) — nothing is submitted" }
  }
  if (selection.urls.length === 0) {
    const [today, yesterday] = recentDays(input.today)
    return { action: "skip", reason: `no URL has lastmod ${today} or ${yesterday} (no recent content change) — nothing is submitted` }
  }
  return {
    action: "submit",
    endpoint: INDEXNOW_ENDPOINT,
    payloads: buildPayloads(input.host, input.key, selection.urls),
    selection,
  }
}

// ---------------------------------------------------------------------------
// End-to-end run with injected fetch (scripts/indexnow.mjs passes the real
// one; tests pass a recorder). Deploy verification comes first and is strict:
// the live build-info.json must name exactly main HEAD *and* pass every
// production freshness check. Without that, the IndexNow endpoint is never
// called — not even the sitemap is read.


export interface RunOptions {
  site: string // https://currencyversus.com
  expectedCommit: string | null // main HEAD
  expectedCommitTime: Date | null
  dryRun: boolean
  now: Date
  fetchFn: typeof fetch
  log: (line: string) => void
  key?: string
}

export interface RunResult {
  exitCode: 0 | 1
  deployVerified: boolean
  plan: Plan
  outcomes: Array<{ status: number; outcome: Outcome; urls: number }>
}

export async function verifyDeploy(o: RunOptions): Promise<{ verified: boolean; reason: string }> {
  if (!o.expectedCommit) return { verified: false, reason: "expected commit (main HEAD) not provided" }
  let info: BuildInfo
  try {
    const res = await o.fetchFn(`${o.site}/build-info.json?check=${o.now.getTime()}`, { headers: { "cache-control": "no-cache" } })
    if (!res.ok) return { verified: false, reason: `build-info.json returned HTTP ${res.status}` }
    info = (await res.json()) as BuildInfo
  } catch (err) {
    return { verified: false, reason: `build-info.json not reachable (${err instanceof Error ? err.message : err})` }
  }
  if (info.commit !== o.expectedCommit) {
    return { verified: false, reason: `live build ${info.commit ?? "unknown"} is not main HEAD ${o.expectedCommit}` }
  }
  const { failures } = checkBuildInfo(info, { now: o.now, expectedCommit: o.expectedCommit, expectedCommitTime: o.expectedCommitTime })
  if (failures.length) return { verified: false, reason: `production checks failed: ${failures.join("; ")}` }
  return { verified: true, reason: `live build is main HEAD ${o.expectedCommit.slice(0, 7)} and passed the production checks` }
}

export async function runIndexNow(o: RunOptions): Promise<RunResult> {
  const host = new URL(o.site).host
  const key = o.key ?? INDEXNOW_KEY
  const today = o.now.toISOString().slice(0, 10)

  const deploy = await verifyDeploy(o)
  o.log(`indexnow: deploy ${deploy.verified ? "verified" : "NOT verified"} — ${deploy.reason}`)

  let sitemapXml: string | null = null
  if (deploy.verified) {
    try {
      const res = await o.fetchFn(`${o.site}/sitemap.xml?check=${o.now.getTime()}`, { headers: { "cache-control": "no-cache" } })
      sitemapXml = res.ok ? await res.text() : null
      if (!res.ok) o.log(`indexnow: sitemap.xml returned HTTP ${res.status}`)
    } catch (err) {
      o.log(`indexnow: sitemap.xml not reachable (${err instanceof Error ? err.message : err})`)
    }
  }

  const plan = planSubmission({ deployVerified: deploy.verified, sitemapXml, today, host, key })
  const outcomes: RunResult["outcomes"] = []
  if (plan.action === "skip") {
    o.log(`indexnow: skip — ${plan.reason}`)
    return { exitCode: 0, deployVerified: deploy.verified, plan, outcomes }
  }

  const total = plan.payloads.reduce((n, p) => n + p.urlList.length, 0)
  o.log(`indexnow: ${total} URL(s) with lastmod ${recentDays(today).join(" or ")}; ${plan.selection.withLastmod} URL(s) in the sitemap carry lastmod`)
  if (plan.selection.foreign.length) o.log(`indexnow: ignored ${plan.selection.foreign.length} URL(s) on another host`)
  o.log(`indexnow: first URLs: ${plan.selection.urls.slice(0, 5).join(" ")}`)

  if (o.dryRun) {
    const sample = { ...plan.payloads[0], urlList: [...plan.payloads[0].urlList.slice(0, 3), ...(plan.payloads[0].urlList.length > 3 ? ["…"] : [])] }
    o.log(`indexnow: DRY RUN — would POST ${plan.payloads.length} request(s) to ${plan.endpoint}`)
    o.log(`indexnow: DRY RUN — body sample: ${JSON.stringify(sample)}`)
    return { exitCode: 0, deployVerified: true, plan, outcomes }
  }

  let exitCode: 0 | 1 = 0
  for (const payload of plan.payloads) {
    const res = await o.fetchFn(plan.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    })
    const outcome = classifyResponse(res.status)
    outcomes.push({ status: res.status, outcome, urls: payload.urlList.length })
    o.log(`indexnow: HTTP ${res.status} (${outcome}) for ${payload.urlList.length} URL(s); first: ${payload.urlList.slice(0, 3).join(" ")}`)
    if (outcome === "rate-limited") {
      o.log("indexnow: rate limited (429) — stopping for today, not a workflow failure")
      break
    }
    if (outcome === "pending-key-verification") o.log("indexnow: 202 — key verification pending at the engine; not a failure")
    if (outcome === "error") exitCode = 1
  }
  return { exitCode, deployVerified: true, plan, outcomes }
}
