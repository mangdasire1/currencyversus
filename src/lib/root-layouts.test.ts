// Root layouts (task C3-1a): every page lives in a route group with its own
// root layout, so a group can set its own <html lang>; one global 404.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const APP = path.join(ROOT, "src", "app")
const read = (...p: string[]) => fs.readFileSync(path.join(...p), "utf8")

test("route groups: no page or layout directly in app/, the English pages in (en) with lang=\"en\"", () => {
  const top = fs.readdirSync(APP)
  for (const f of ["page.tsx", "layout.tsx", "not-found.tsx"]) assert.ok(!top.includes(f), `app/${f} would sit outside the route groups`)
  for (const d of ["[pair]", "metals", "method", "currencies"]) assert.ok(!top.includes(d), `app/${d}/ is outside the (en) group`)
  for (const f of ["page.tsx", "layout.tsx", "not-found.tsx", "HomeClient.tsx", "[pair]", "metals", "method", "currencies"]) {
    assert.ok(fs.existsSync(path.join(APP, "(en)", f)), `(en)/${f} missing`)
  }
  const layout = read(APP, "(en)", "layout.tsx")
  assert.match(layout, /export const metadata = SITE_METADATA;/)
  assert.match(layout, /<SiteDocument lang="en">\{children\}<\/SiteDocument>/)
  // the document markup the root layout had: lang, font variables, JSON-LD, CacheJanitor
  const doc = read(APP, "site-document.tsx")
  assert.match(doc, /<html\s+lang=\{lang\}\s+className=\{`\$\{spaceGrotesk\.variable\} \$\{jetbrainsMono\.variable\} \$\{dmSans\.variable\} dark`\}/)
  assert.match(doc, /type="application\/ld\+json"/)
  assert.match(doc, /<body className="min-h-full antialiased">\s*<CacheJanitor \/>/)
})

test("global 404: the same document, metadata and content, enabled in next.config and checked after every build", () => {
  const gnf = read(APP, "global-not-found.tsx")
  assert.match(gnf, /export const metadata = SITE_METADATA;/)
  assert.match(gnf, /<SiteDocument lang="en">\s*<NotFound \/>\s*<\/SiteDocument>/)
  assert.match(gnf, /import NotFound from "\.\/\(en\)\/not-found"/)
  assert.match(read(ROOT, "next.config.ts"), /experimental: \{ globalNotFound: true \}/)
  const build = JSON.parse(read(ROOT, "package.json")).scripts.build as string
  assert.match(build, /^next build && .*npm run verify:404 &&/)
  assert.ok(fs.existsSync(path.join(ROOT, "scripts", "verify-404.mjs")))
})
