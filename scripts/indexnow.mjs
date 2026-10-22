// Notify IndexNow (Bing, Yandex, Seznam, Naver, … — not Google) about pages
// whose content changed today, after the live deploy is verified.
// Logic, gate and tests: src/lib/indexnow.ts / indexnow.test.ts.
//
//   EXPECTED_SHA=<main HEAD> EXPECTED_SHA_TIME=<ISO> [INDEXNOW_DRY_RUN=1] \
//     node --experimental-strip-types scripts/indexnow.mjs [https://currencyversus.com]
//
// INDEXNOW_DRY_RUN=1 runs every step (deploy check, live sitemap, URL
// selection, request body) but sends nothing.

import { runIndexNow } from "../src/lib/indexnow.ts"

const site = (process.argv[2] ?? "https://currencyversus.com").replace(/\/$/, "")
const dryRun = ["1", "true", "yes"].includes(String(process.env.INDEXNOW_DRY_RUN ?? "").toLowerCase())

const result = await runIndexNow({
  site,
  expectedCommit: process.env.EXPECTED_SHA || null,
  expectedCommitTime: process.env.EXPECTED_SHA_TIME ? new Date(process.env.EXPECTED_SHA_TIME) : null,
  dryRun,
  now: new Date(),
  fetchFn: fetch,
  log: (line) => console.log(line),
})

if (result.exitCode !== 0) console.log("::error::IndexNow rejected the submission (see the status above)")
process.exitCode = result.exitCode
