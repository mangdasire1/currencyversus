// Fonts are self-hosted (src/app/fonts/README.md): the build must not depend on
// Google Fonts, and every face must point at a file in the repository.
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app")
const FONTS = path.join(APP, "fonts")
const layout = fs.readFileSync(path.join(APP, "layout.tsx"), "utf8")
const css = fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8")

test("no Google Fonts: nothing in src imports next/font/google", () => {
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(tsx?|css)$/.test(e.name) ? [path.join(d, e.name)] : []))
  const src = path.join(APP, "..")
  // comments may mention Google Fonts (where the files came from); code may not
  const code = (f: string) => fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
  const files = walk(src).filter((f) => !f.endsWith("fonts.test.ts"))
  const hits = files.filter((f) => /next\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(code(f)))
  assert.ok(files.length > 50)
  assert.deepEqual(hits, [])
})

test("each localFont call: the file exists, its family has the other subsets in fonts.css, its fallback face is defined", () => {
  const calls = [...layout.matchAll(/const (\w+) = localFont\(\{([\s\S]*?)\n\}\);/g)]
  assert.equal(calls.length, 3)
  for (const [, name, body] of calls) {
    const src = body.match(/src: "\.\/fonts\/([^"]+)"/)![1]
    assert.ok(fs.existsSync(path.join(FONTS, src)), src)
    assert.match(body, /display: "swap"/)
    // next/font/local names the family after the variable: fonts.css must match
    assert.ok(css.includes(`font-family: "${name}";`), `${name}: no subsets in fonts.css`)
    const fallback = body.match(/fallback: \["([^"]+)"\]/)![1]
    assert.ok(css.includes(`font-family: "${fallback}";`), `${fallback} not defined`)
  }
  const families = new Set([...css.matchAll(/font-family: "([^"]+)";/g)].map((m) => m[1]).filter((f) => !f.endsWith(" Fallback")))
  assert.deepEqual([...families].sort(), calls.map((c) => c[1]).sort())
})

test("every url() in fonts.css is a file in the repository, every font file has its license", () => {
  const urls = [...css.matchAll(/url\("\.\/([^"]+)"\)/g)].map((m) => m[1])
  assert.equal(urls.length, 8)
  for (const u of urls) assert.ok(fs.existsSync(path.join(FONTS, u)), u)
  // (written as font-displa[y] so Tailwind does not read it as a class name)
  assert.match(css, /font-displa[y]: swap;/)
  assert.doesNotMatch(css, /font-displa[y]: (?!swap)/)
  for (const f of fs.readdirSync(FONTS).filter((f) => f.endsWith(".woff2"))) {
    const lic = { "space-grotesk": "OFL-spacegrotesk.txt", "jetbrains-mono": "OFL-jetbrainsmono.txt", "dm-sans": "OFL-dmsans.txt" }[f.replace(/-(latin|vietnamese|greek|cyrillic).*$/, "")]
    assert.ok(lic && /SIL OPEN FONT LICENSE Version 1\.1/.test(fs.readFileSync(path.join(FONTS, lic), "utf8")), f)
  }
})
