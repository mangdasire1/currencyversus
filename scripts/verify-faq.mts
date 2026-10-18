// Post-build check (R-04): on every generated page that carries FAQPage
// JSON-LD, each question and answer must also appear in the visible HTML.
//
//   node scripts/verify-faq.mts        (after `next build`)

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out")

const decode = (s: string) =>
  s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")

function visibleText(html: string): string {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<!-- -->/g, "") // React text-node separators
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ")
}

let pagesWithFaq = 0
let pairs = 0
const problems: string[] = []
for (const dir of fs.readdirSync(outDir)) {
  const file = path.join(outDir, dir, "index.html")
  if (!dir.includes("-vs-") || !fs.existsSync(file)) continue
  const html = fs.readFileSync(file, "utf8")
  const text = visibleText(html)
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(m[1])
    if (data["@type"] !== "FAQPage") continue
    pagesWithFaq++
    for (const q of data.mainEntity) {
      pairs++
      const question = q.name.replace(/\s+/g, " ")
      const answer = q.acceptedAnswer.text.replace(/\s+/g, " ")
      if (!text.includes(question)) problems.push(`${dir}: question not visible: ${question}`)
      if (!text.includes(answer)) problems.push(`${dir}: answer not visible for: ${question}`)
    }
  }
}
console.log(`verify-faq: ${pagesWithFaq} pages with FAQPage JSON-LD, ${pairs} Q&A pairs, ${problems.length} not visible`)
if (problems.length) {
  console.log("  " + problems.slice(0, 20).join("\n  "))
  process.exitCode = 1
}
