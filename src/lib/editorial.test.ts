// Editorial content policy — written down as a test.
//
// The explanatory texts in currency-info.ts and metal-info.ts are not
// refreshed like prices, so they must not depend on facts that go stale.
// Every claim falls into one of three categories:
//
//   A — factually wrong: rewrite in durable terms; do not research and insert
//       a "correct" number (it will be wrong again later).
//   B — possibly true but volatile (rankings, percentages, production or
//       reserve amounts, period averages, member counts): keep the
//       information, drop the figure ("one of the leading producers").
//   C — unsourced or unverifiable (incl. company names, tax claims and
//       investment calls): remove, and replace with a durable statement.
//
// The guard below scans every text field and fails with the record, field,
// matched phrase and policy rule. ALLOWLIST holds deliberate, justified
// exceptions only — it is empty today; add an entry only with a reason.

import { test } from "node:test"
import assert from "node:assert/strict"
import { EDITORIAL_REVIEWED, editorialReviewDate, editorialReviewLabel } from "./editorial.ts"
import { CURRENCY_INFO } from "./currency-info.ts"
import { METAL_INFO, GOLD_SILVER_RATIO_INFO } from "./metal-info.ts"

interface Rule {
  id: string
  category: "A" | "B" | "C"
  pattern: RegExp
  why: string
}

const RULES: Rule[] = [
  { id: "percentage", category: "B", pattern: /%|\bper ?cent\b/i, why: "percentages change; state the relationship without a figure" },
  { id: "ranking-superlative", category: "B", pattern: /\b(largest|biggest)\b/i, why: "size rankings change; use 'major' / 'one of the leading'" },
  { id: "ranking-most-traded", category: "B", pattern: /\bmost[- ]traded\b/i, why: "trading-volume rankings change between surveys" },
  {
    id: "ranking-ordinal",
    category: "B",
    pattern: /\b(second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(st|nd|rd|th))[- ](most|largest|biggest|highest)\b/i,
    why: "ordinal rankings change",
  },
  { id: "ranking-top-n", category: "B", pattern: /\btop[- ]?\d+\b/i, why: "'top N' rankings change" },
  { id: "ranking-ranks", category: "B", pattern: /\branks?\b|\branked\b/i, why: "rankings change" },
  {
    id: "quantity",
    category: "B",
    pattern: /\b(million|billion)s? (ounces|oz)\b|\bmetric tons?\b|\btonnes\b|\bbillions? of\b/i,
    why: "production/reserve amounts are estimates revised every year",
  },
  { id: "period-average", category: "B", pattern: /\bsince (1[5-9]|20)\d{2}\b/i, why: "averages 'since <year>' move as the period grows" },
  {
    id: "year-range",
    category: "B",
    pattern: /\b(1[5-9]|20)\d{2}\s*(–|-|to)\s*((1[5-9]|20)\d{2}|\d{2})\b/,
    why: "statistics over a year range need a source and date",
  },
  { id: "member-count", category: "B", pattern: /\b\d+ of the \d+\b/i, why: "membership counts change (the Bulgaria eurozone error)" },
  {
    id: "company-name",
    category: "C",
    pattern: /\b(Samsung|Hyundai|LG|SK Hynix|Sony|Panasonic|TDK|Pemex|Barrick|Agnico|Valcambi|PAMP|Argor|Fresnillo|Grupo M[eé]xico|Pe[nñ]oles|First Majestic|BHP|South32|Northvolt|GLD|IAU)\b/,
    why: "no individual company or fund names — they rename, merge and fail",
  },
  { id: "tax-claim", category: "C", pattern: /\b(tax|taxed|exempt|exemption|GST|VAT|IOF)\b/i, why: "tax rules change; no tax claims" },
  {
    id: "investment-call",
    category: "C",
    pattern: /\b(historically cheap|undervalued|overvalued|opportunity to|buy signal|increase (silver|gold) exposure)\b/i,
    why: "no investment advice",
  },
]

// [record.field, rule id, reason]. Empty on purpose.
const ALLOWLIST: Array<[string, string, string]> = []

function editorialFields(): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = []
  for (const [code, c] of Object.entries(CURRENCY_INFO)) {
    out.push({ where: `CURRENCY_INFO.${code}.description`, text: c.description })
    out.push({ where: `CURRENCY_INFO.${code}.economy`, text: c.economy })
    c.factors.forEach((f, i) => out.push({ where: `CURRENCY_INFO.${code}.factors[${i}]`, text: f }))
    out.push({ where: `CURRENCY_INFO.${code}.funFact`, text: c.funFact })
  }
  for (const [code, m] of Object.entries(METAL_INFO)) {
    out.push({ where: `METAL_INFO.${code}.description`, text: m.description })
    m.factors.forEach((f, i) => out.push({ where: `METAL_INFO.${code}.factors[${i}]`, text: f }))
    out.push({ where: `METAL_INFO.${code}.funFact`, text: m.funFact })
    for (const [cur, t] of Object.entries(m.localContext)) {
      out.push({ where: `METAL_INFO.${code}.localContext.${cur}`, text: t })
    }
  }
  out.push({ where: "GOLD_SILVER_RATIO_INFO.description", text: GOLD_SILVER_RATIO_INFO.description })
  out.push({ where: "GOLD_SILVER_RATIO_INFO.historical", text: GOLD_SILVER_RATIO_INFO.historical })
  GOLD_SILVER_RATIO_INFO.interpretation.forEach((t, i) =>
    out.push({ where: `GOLD_SILVER_RATIO_INFO.interpretation[${i}]`, text: t })
  )
  out.push({ where: "GOLD_SILVER_RATIO_INFO.funFact", text: GOLD_SILVER_RATIO_INFO.funFact })
  return out
}

function findPolicyViolations(fields = editorialFields()): string[] {
  const violations: string[] = []
  for (const { where, text } of fields) {
    for (const rule of RULES) {
      const m = text.match(rule.pattern)
      if (!m) continue
      if (ALLOWLIST.some(([w, id]) => w === where && id === rule.id)) continue
      const at = m.index ?? 0
      const context = text.slice(Math.max(0, at - 40), at + m[0].length + 40)
      violations.push(`${where}: "${m[0]}" — policy ${rule.category} (${rule.id}): ${rule.why}\n      …${context}…`)
    }
  }
  return violations
}

test("editorial guard: no volatile figures, rankings, company names, tax or investment claims", () => {
  const fields = editorialFields()
  const violations = findPolicyViolations(fields)
  console.log(`    scanned ${fields.length} text fields against ${RULES.length} rules; allowlist entries: ${ALLOWLIST.length}`)
  assert.deepEqual(violations, [], "\n" + violations.join("\n"))
})

test("editorial guard: every allowlist entry still refers to a real violation", () => {
  // Keeps the allowlist from silently accumulating stale exceptions.
  for (const [where, id, reason] of ALLOWLIST) {
    assert.ok(reason.length > 10, `${where}/${id}: allowlist entry needs a reason`)
    const field = editorialFields().find((f) => f.where === where)
    const rule = RULES.find((r) => r.id === id)
    assert.ok(field && rule && rule.pattern.test(field.text), `${where}/${id}: allowlist entry no longer matches anything`)
  }
})

test("editorial guard catches each rule (self-test)", () => {
  const samples: Record<string, string> = {
    percentage: "About 60% of reserves",
    "ranking-superlative": "the world's largest producer",
    "ranking-most-traded": "the fourth most traded currency",
    "ranking-ordinal": "the second largest economy",
    "ranking-top-n": "a top-15 economy",
    "ranking-ranks": "it ranks among the best",
    quantity: "over 200 million ounces a year",
    "period-average": "the average since 1900",
    "year-range": "between 2010–2020",
    "member-count": "used by 20 of the 27 states",
    "company-name": "Northvolt's factory",
    "tax-claim": "exempt from the IOF",
    "investment-call": "silver is historically cheap",
  }
  for (const rule of RULES) {
    const v = findPolicyViolations([{ where: `sample.${rule.id}`, text: samples[rule.id] }])
    assert.ok(v.some((s) => s.includes(`(${rule.id})`)), `rule ${rule.id} did not catch its sample`)
  }
})

test("every currency with editorial content has a review entry", () => {
  for (const code of Object.keys(CURRENCY_INFO)) assert.ok(code in EDITORIAL_REVIEWED, code)
  for (const code of ["XAU", "XAG", "GOLD_SILVER_RATIO"]) assert.ok(code in EDITORIAL_REVIEWED, code)
})

test("unreviewed records never show a review date", () => {
  assert.equal(editorialReviewDate(["USD", "EUR"]), null)
  assert.match(editorialReviewLabel(["USD", "EUR"]), /review pending/)
})

test("EUR makes no member-count claim (the Bulgaria error class: counts go stale)", () => {
  assert.doesNotMatch(CURRENCY_INFO.EUR.description, /\b\d+ of the \d+\b/)
  assert.match(CURRENCY_INFO.EUR.description, /shared by most European Union member states/)
})
