// Production freshness check (run daily by .github/workflows/production-monitor.yml).
//
//   EXPECTED_SHA=<main HEAD> EXPECTED_SHA_TIME=<ISO commit time> \
//     node --experimental-strip-types scripts/check-production.mjs [url]
//
// Plain JavaScript; imports the check logic from src/lib/freshness.ts (tested
// there), hence --experimental-strip-types on Node 22.
//
// Exits 1 when the live build is not main HEAD (after a deploy grace
// period), the published build is too old, or the embedded ECB/metal data
// is behind. Weekends and ECB holidays are not counted as missed days.

import { checkBuildInfo } from "../src/lib/freshness.ts"

const url = process.argv[2] ?? "https://currencyversus.com/build-info.json"
const expectedCommit = process.env.EXPECTED_SHA || null
const expectedTime = process.env.EXPECTED_SHA_TIME ? new Date(process.env.EXPECTED_SHA_TIME) : null

// Cache-busting query so the check sees what the origin serves now.
const res = await fetch(`${url}?check=${Date.now()}`, { headers: { "cache-control": "no-cache" } })
// process.exitCode (not process.exit) so open fetch handles close cleanly.
if (!res.ok) {
  console.error(`::error::${url} returned HTTP ${res.status}`)
  process.exitCode = 1
} else {
  const info = await res.json()
  console.log("build-info.json:", JSON.stringify(info))

  const { failures, notes } = checkBuildInfo(info, { now: new Date(), expectedCommit, expectedCommitTime: expectedTime })
  for (const n of notes) console.log(`ok    ${n}`)
  for (const f of failures) console.log(`::error::${f}`)
  process.exitCode = failures.length ? 1 : 0
}
