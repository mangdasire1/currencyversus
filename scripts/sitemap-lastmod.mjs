// Post-build: write out/sitemap.xml with <lastmod> values that only move when
// a page's visible content really changed, and publish the manifest the next
// build compares against (out/lastmod-manifest.json → /lastmod-manifest.json).
// Logic and rules: src/lib/lastmod.ts.
//
//   node --experimental-strip-types scripts/sitemap-lastmod.mjs     (after `next build`)
//
// LASTMOD_MANIFEST_URL overrides where the previous manifest is read from
// (default: the live site). If it cannot be read, no <lastmod> is written for
// pages without a known date — the build does not fail and no date is invented.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { fingerprint, isManifest, nextManifest, sitemapXml } from "../src/lib/lastmod.ts"
import { routeCatalog } from "../src/lib/routes.ts"

const SITE = "https://currencyversus.com"
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const outDir = path.join(root, "out")
const manifestUrl = process.env.LASTMOD_MANIFEST_URL || `${SITE}/lastmod-manifest.json`
const today = new Date().toISOString().slice(0, 10)

const urls = ["/", ...routeCatalog().map((slug) => `/${slug}/`)]
const fingerprints = {}
for (const url of urls) {
  const file = path.join(outDir, url, "index.html")
  if (!fs.existsSync(file)) {
    console.error(`sitemap-lastmod: missing page ${file}`)
    process.exit(1)
  }
  fingerprints[url] = fingerprint(fs.readFileSync(file, "utf8"))
}

let previous = null
let previousNote
try {
  const res = await fetch(`${manifestUrl}?build=${Date.now()}`, { signal: AbortSignal.timeout(15000) })
  if (res.ok) {
    const json = await res.json().catch(() => null)
    if (isManifest(json)) {
      previous = json
      previousNote = `previous manifest: ${Object.keys(json).length} URLs from ${manifestUrl}`
    } else {
      previousNote = `previous manifest at ${manifestUrl} is not valid — dates unknown`
    }
  } else {
    previousNote = `previous manifest not available (HTTP ${res.status}) — dates unknown`
  }
} catch (err) {
  previousNote = `previous manifest not reachable (${err instanceof Error ? err.message : err}) — dates unknown`
}

const { manifest, summary } = nextManifest(previous, fingerprints, today)
fs.writeFileSync(path.join(outDir, "lastmod-manifest.json"), JSON.stringify(manifest))
fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemapXml(SITE, manifest, urls))

console.log(`sitemap-lastmod: ${previousNote}`)
console.log(
  `sitemap-lastmod: ${urls.length} URLs — unchanged (date carried) ${summary.carried}, changed → ${today} ${summary.changed}, ` +
    `new → ${today} ${summary.added}, no reliable date (lastmod omitted) ${summary.unknown}`
)
