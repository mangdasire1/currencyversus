// Post-build: write out/.well-known/security.txt (RFC 9116) with an Expires
// date that moves with every build. Content and reasons: src/lib/security-txt.ts.
//
//   node --experimental-strip-types scripts/security-txt.mjs     (after `next build`)

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { securityTxt } from "../src/lib/security-txt.ts"

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out")
const dir = path.join(outDir, ".well-known")
fs.mkdirSync(dir, { recursive: true })
const text = securityTxt(new Date())
fs.writeFileSync(path.join(dir, "security.txt"), text)
console.log(`security-txt: wrote out/.well-known/security.txt — ${text.trim().split("\n").join(" | ")}`)
