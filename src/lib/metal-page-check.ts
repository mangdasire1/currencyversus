// Post-build check for metal pages (Phase 10). Pure — tested in
// metal-page-check.test.ts, run over out/ by scripts/verify-metals.mjs.
//
// The price is the only reason these pages exist. A metal page whose static
// HTML has no build-time price ("Loading price…", an empty converter) must
// not be published: the build fails and the previous deploy stays live.
//
// A page passes when its server HTML carries a positive price in all three
// places a reader sees it before JavaScript runs:
//   1. the headline rate ("1 oz Platinum = 1,544 USD", gold/silver page:
//      "1 oz Gold = 78.20 oz Silver")
//   2. the converter's computed field (value="1,544")
//   3. the converter sentence ("1 troy ounce of platinum = 1,544 USD")

export interface MetalPageExpectation {
  metalName: string // "Platinum"
  quote: string // "USD", or "Silver" on the gold/silver page
}

const NUMBER = String.raw`(\d[\d,]*(?:\.\d+)?)`

function visibleText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
}

const positive = (s: string | undefined) => s !== undefined && Number(s.replace(/,/g, "")) > 0

export function checkMetalPageHtml(html: string, { metalName, quote }: MetalPageExpectation): { problems: string[]; price: string | null } {
  const text = visibleText(html)
  const problems: string[] = []
  const isRatio = quote === "Silver"

  const headline = text.match(new RegExp(`1 oz ${metalName} = ${NUMBER} ${isRatio ? "oz Silver" : quote}\\b`))?.[1]
  if (!positive(headline)) problems.push(`no headline price ("1 oz ${metalName} = … ${isRatio ? "oz Silver" : quote}")`)

  const sentence = text.match(
    new RegExp(`1 troy ounce of ${metalName.toLowerCase()} = ${NUMBER} ${isRatio ? "troy ounces of silver" : quote}\\b`)
  )?.[1]
  if (!positive(sentence)) problems.push(`no converter result ("1 troy ounce of ${metalName.toLowerCase()} = …")`)

  // The weight field holds "1"; the computed value field must hold the price.
  const fields = [...html.matchAll(/<input\b[^>]*\binputMode="decimal"[^>]*>|<input\b[^>]*\binputmode="decimal"[^>]*>/gi)].map(
    (m) => m[0].match(/\bvalue="([^"]*)"/)?.[1] ?? ""
  )
  if (fields.length < 2 || fields[0] !== "1" || !positive(fields[1])) problems.push(`converter fields not pre-filled (${JSON.stringify(fields)})`)

  return { problems, price: sentence ?? null }
}
