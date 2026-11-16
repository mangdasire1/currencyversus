import { execFileSync } from "node:child_process"
import { getInitialRateData, getBuildTimeMetalPrice } from "@/lib/build-data"
import type { BuildInfo } from "@/lib/freshness"
import { METALS } from "@/lib/metals"

// Rendered once at `next build` into out/build-info.json (static export
// Route Handler, GET only). It uses the same build-time fetchers — and so the
// same fetch cache — as the pages, so the dates below are the data embedded
// in this build's HTML.
//
// Age vocabulary (keep these apart in code and reports):
//   - build input age: how old the data was when this build fetched it;
//   - published HTML age: now − buildTime. A static export does not change
//     until the next successful build + deploy; the production monitor
//     (.github/workflows/production-monitor.yml) watches this one.

// Required in this Next version for a static-export Route Handler.
export const dynamic = "force-static"

function buildCommit(): string | null {
  // Cloudflare Pages sets CF_PAGES_COMMIT_SHA; GitHub Actions sets GITHUB_SHA.
  const fromEnv = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA
  if (fromEnv) return fromEnv
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() || null
  } catch {
    return null
  }
}

export async function GET() {
  // Every metal the site shows (METALS), so the production monitor watches
  // all of them — platinum and palladium were missing here until Phase A4.
  const [fx, ...metalPrices] = await Promise.all([
    getInitialRateData("USD", "EUR"),
    ...METALS.map((m) => getBuildTimeMetalPrice(m.code)),
  ])

  const info: BuildInfo = {
    buildTime: new Date().toISOString(),
    commit: buildCommit(),
    branch: process.env.CF_PAGES_BRANCH || null,
    fx: { pair: "USD/EUR", date: fx?.date ?? null },
    metals: Object.fromEntries(METALS.map((m, i) => [m.code, metalPrices[i] ? { priceTime: metalPrices[i]!.priceTime } : null])),
  }
  return Response.json(info)
}
