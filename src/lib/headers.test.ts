// public/_headers (Cloudflare Pages): limits, and the headers each kind of
// path ends up with. Cloudflare applies every rule whose pattern matches
// ("An incoming request which matches multiple rules' URL patterns will
// inherit all rules' headers") and joins a header set twice with a comma,
// which breaks Cache-Control — so it must be set by one matching rule only.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "_headers")
const text = fs.readFileSync(FILE, "utf8")

interface Rule { pattern: string; headers: Array<[string, string]> }

function parse(src: string): Rule[] {
  const rules: Rule[] = []
  for (const raw of src.split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue
    if (!/^\s/.test(raw)) { rules.push({ pattern: raw.trim(), headers: [] }); continue }
    const line = raw.trim()
    const i = line.indexOf(":")
    rules.at(-1)!.headers.push([line.slice(0, i).trim().toLowerCase(), line.slice(i + 1).trim()])
  }
  return rules
}

// One splat, greedy (Cloudflare's matching for path patterns used here).
const matches = (pattern: string, p: string) => {
  const re = new RegExp("^" + pattern.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$")
  return re.test(p)
}

function headersFor(p: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const r of parse(text)) if (matches(r.pattern, p)) for (const [k, v] of r.headers) out.set(k, [...(out.get(k) ?? []), v])
  return out
}

const SECURITY = ["x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "content-security-policy", "strict-transport-security"]

test("_headers: within Cloudflare's limits (100 rules, 2,000 characters a line)", () => {
  const rules = parse(text)
  const longest = Math.max(...text.split(/\r?\n/).map((l) => l.length))
  console.log(`    ${rules.length} rules, longest line ${longest} characters`)
  assert.ok(rules.length <= 100)
  assert.ok(longest <= 2000)
})

test("_headers: hashed build files are cached for a year, immutable, and keep every security header", () => {
  for (const p of ["/_next/static/chunks/0t1n8rpr3gaz8.js", "/_next/static/media/dm_sans_latin.p.2_mbdogr7ni8i.woff2", "/_next/static/K958x0gMaVbtLguoGRnzk/_buildManifest.js"]) {
    const h = headersFor(p)
    assert.deepEqual(h.get("cache-control"), ["public, max-age=31536000, immutable"], `${p}: one Cache-Control value, not joined`)
    for (const s of SECURITY) assert.equal(h.get(s)?.length, 1, `${p}: ${s}`)
  }
})

test("_headers: pages and other files are not marked immutable", () => {
  for (const p of ["/", "/usd-vs-try/", "/metals/", "/build-info.json", "/sitemap.xml", "/lastmod-manifest.json", "/.well-known/security.txt", "/logo.png"]) {
    const h = headersFor(p)
    assert.equal(h.get("cache-control"), undefined, `${p} gets Cloudflare's default caching`)
    for (const s of SECURITY) assert.equal(h.get(s)?.length, 1, `${p}: ${s}`)
  }
})
