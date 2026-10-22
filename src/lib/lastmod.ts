// Sitemap <lastmod> that reflects real changes to what a page shows.
// Pure — tested with `node --test`; used by scripts/sitemap-lastmod.mjs.
//
// Each page gets a fingerprint of its visible text (prices, data dates,
// historical statistics, editorial text, method notes). The previous
// deployment publishes /lastmod-manifest.json; at build time it is fetched
// and compared:
//   - same fingerprint      → carry the previous lastmod (rebuilds of the
//                             same content do not move the date)
//   - different fingerprint → today (new data observation, changed price or
//                             statistic, changed text)
//   - URL new in this build → today (first published now)
//   - no previous manifest  → unknown: no lastmod for that URL, never a
//                             made-up date. A date appears with the next
//                             real change.

import { createHash } from "node:crypto"

export interface ManifestEntry {
  fingerprint: string
  lastmod: string | null // YYYY-MM-DD, or null when not known
}

export type Manifest = Record<string, ManifestEntry>

// Visible text of a page, without the parts that change on every build or
// poll while the content does not: scripts/styles/markup, and the metal
// provider's "last update" time (gold-api moves it on each poll even when
// the price is unchanged, e.g. at weekends).
export function visibleContent(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/Provider's last update[^·]*?\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/g, "Provider's last update")
    .replace(/silver: \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/g, "silver:")
    .replace(/\s+/g, " ")
    .trim()
}

export function fingerprint(html: string): string {
  return createHash("sha256").update(visibleContent(html)).digest("hex").slice(0, 32)
}

export function isManifest(x: unknown): x is Manifest {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false
  return Object.values(x as Record<string, unknown>).every(
    (e) =>
      !!e &&
      typeof e === "object" &&
      typeof (e as ManifestEntry).fingerprint === "string" &&
      ((e as ManifestEntry).lastmod === null || /^\d{4}-\d{2}-\d{2}$/.test(String((e as ManifestEntry).lastmod)))
  )
}

export interface LastmodSummary {
  carried: number // unchanged content, previous date kept
  changed: number // content changed → today
  added: number // URL not in previous manifest → today
  unknown: number // no reliable date → lastmod omitted
}

export function nextManifest(
  previous: Manifest | null,
  fingerprints: Record<string, string>,
  today: string
): { manifest: Manifest; summary: LastmodSummary } {
  const manifest: Manifest = {}
  const summary: LastmodSummary = { carried: 0, changed: 0, added: 0, unknown: 0 }
  for (const [url, fp] of Object.entries(fingerprints)) {
    if (!previous) {
      manifest[url] = { fingerprint: fp, lastmod: null }
      summary.unknown++
      continue
    }
    const prev = previous[url]
    if (!prev) {
      manifest[url] = { fingerprint: fp, lastmod: today }
      summary.added++
    } else if (prev.fingerprint === fp) {
      manifest[url] = { fingerprint: fp, lastmod: prev.lastmod }
      if (prev.lastmod === null) summary.unknown++
      else summary.carried++
    } else {
      manifest[url] = { fingerprint: fp, lastmod: today }
      summary.changed++
    }
  }
  return { manifest, summary }
}

export function sitemapXml(siteUrl: string, manifest: Manifest, order: string[]): string {
  const entries = order.map((url) => {
    const lastmod = manifest[url]?.lastmod
    const priority = url === "/" ? "1.0" : "0.8"
    return [
      "  <url>",
      `    <loc>${siteUrl}${url}</loc>`,
      ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
      "    <changefreq>daily</changefreq>",
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n")
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`
}
