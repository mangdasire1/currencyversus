// /.well-known/security.txt and the dependency checks (Phase A5).
import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { securityTxt, SECURITY_EXPIRES_DAYS } from "./security-txt.ts"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

test("security.txt: RFC 9116 required fields, https contact, no e-mail address", () => {
  const now = new Date("2026-11-16T05:00:00Z")
  const text = securityTxt(now)
  console.log(text.trim().split("\n").map((l) => `    ${l}`).join("\n"))
  const fields = Object.fromEntries(text.trim().split("\n").map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 2)]))
  assert.equal(fields.Contact, "https://github.com/mangdasire1/currencyversus/issues")
  assert.equal(fields.Canonical, "https://currencyversus.com/.well-known/security.txt")
  // no e-mail anywhere: the owner has not approved publishing one
  assert.doesNotMatch(text, /mailto:|@/)
  // Expires: a valid date in the future, less than a year ahead
  assert.match(fields.Expires, /^\d{4}-\d{2}-\d{2}T00:00:00Z$/)
  const days = (Date.parse(fields.Expires) - now.getTime()) / 86_400_000
  assert.ok(days > SECURITY_EXPIRES_DAYS - 1 && days <= SECURITY_EXPIRES_DAYS && days < 365, `${days} days`)
})

test("security.txt is written by the build, so its Expires date cannot run out unnoticed", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
  assert.match(pkg.scripts.build, /npm run security:txt/)
  assert.match(pkg.scripts["security:txt"], /scripts\/security-txt\.mjs/)
  assert.ok(!fs.existsSync(path.join(ROOT, "public", ".well-known", "security.txt")), "no static copy with a fixed date")
})

test("dependencies are watched: Dependabot for npm and actions, weekly npm audit", () => {
  const dependabot = fs.readFileSync(path.join(ROOT, ".github", "dependabot.yml"), "utf8")
  assert.match(dependabot, /package-ecosystem: "npm"/)
  assert.match(dependabot, /package-ecosystem: "github-actions"/)
  const audit = fs.readFileSync(path.join(ROOT, ".github", "workflows", "dependency-audit.yml"), "utf8")
  assert.match(audit, /schedule:/)
  assert.match(audit, /npm audit --audit-level=high/)
  assert.match(audit, /permissions:\s+contents: read/)
})
