// The site's 404 page (out/404.html), which Cloudflare Pages serves for any
// unknown URL. Since the pages moved into route groups it comes from
// src/app/global-not-found.tsx, an experimental Next feature
// (experimental.globalNotFound): if it ever stops working, Next falls back to
// its own bare 404 — no lang, no styles, none of the links below. The build
// fails instead.
import fs from "node:fs"
import path from "node:path"

const outDir = path.join(process.cwd(), process.argv[2] ?? "out")
const file = path.join(outDir, "404.html")
const problems = []

if (!fs.existsSync(file)) problems.push("out/404.html is missing")
else {
  const html = fs.readFileSync(file, "utf8")
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/g, " ")
  const text = markup.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ")

  if (!/^<!DOCTYPE html><html lang="en"[ >]/.test(html)) problems.push(`<html lang="en"> missing (starts with ${JSON.stringify(html.slice(0, 40))})`)
  const robots = markup.match(/<meta name="robots"[^>]*>/g) ?? []
  if (robots.length !== 1 || robots[0] !== '<meta name="robots" content="noindex"/>') problems.push(`robots: expected one noindex meta, found ${JSON.stringify(robots)}`)
  if (!/<title>CurrencyVersus — Compare World Currencies<\/title>/.test(markup)) problems.push("site title missing")

  // the site's stylesheet, and the file it names exists
  const css = [...markup.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1])
  if (css.length === 0) problems.push("no stylesheet (unstyled default 404?)")
  for (const href of css) if (!fs.existsSync(path.join(outDir, href))) problems.push(`stylesheet ${href} not in out/`)

  // the page's own content: header, message, way home, popular pairs, method link
  for (const t of ["404", "Page not found", "This currency pair doesn't exist or the page has moved.", "← Back to homepage", "Popular pairs", "USD → EUR", "How we source and calculate the figures"]) {
    if (!text.includes(t)) problems.push(`text missing: "${t}"`)
  }
  if (!/<header\b/.test(markup)) problems.push("site header missing")
  for (const href of ["/", "/usd-vs-eur/", "/method/", "/currencies/"]) {
    if (!markup.includes(`href="${href}"`)) problems.push(`link to ${href} missing`)
  }
}

console.log(`verify-404: out/404.html — ${problems.length} problem(s)`)
if (problems.length) {
  console.log("  " + problems.join("\n  "))
  process.exit(1)
}
