// Editorial content policy — written down as a test.
//
// The explanatory texts in currency-info.ts and metal-info.ts are not
// refreshed like prices, so they must not depend on facts that go stale.
//
// Standard (Phase 5): a figure, ranking or comparison is published only as a
// SourcedClaim (src/lib/claims.ts) with source, period (asOf), review date and
// reviewer. Plain text carries none of them — and removing the number from a
// ranking ("most held reserve currency") does not make it a non-ranking.
//
// When reviewing, every claim falls into one of three categories:
//   A — factually wrong: rewrite in durable terms; do not research and insert
//       a "correct" number without a source.
//   B — possibly true but volatile or comparative (rankings with or without
//       numbers, percentages, amounts, averages, member counts): either move
//       it to a SourcedClaim or rewrite it without the comparison.
//   C — unsourced or unverifiable (incl. company names, tax claims and
//       investment calls): remove, and replace with a durable statement.
// The measure of a block is the user question it answers, not its length.
//
// The guard below scans every plain text field and fails with the record,
// field, matched phrase and policy rule. ALLOWLIST holds deliberate, justified
// exceptions only; each entry states why it is allowed.

import { test } from "node:test"
import assert from "node:assert/strict"
import { EDITORIAL_REVIEWED, editorialReviewDate, editorialReviewLabel } from "./editorial.ts"
import { CURRENCY_INFO } from "./currency-info.ts"
import { METAL_INFO, GOLD_SILVER_RATIO_INFO } from "./metal-info.ts"
import { claimProblems } from "./claims.ts"
import type { SourcedClaim } from "./claims.ts"

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
  // Phase 5: rankings and comparisons without numbers are still rankings.
  {
    id: "numberless-ranking",
    category: "B",
    pattern: /\b(most|leading|premier|primary|foremost|dominant|oldest|newest|poorest|richest|deepest|strongest|weakest|highest|lowest)\b/i,
    why: "a ranking without a number is still a ranking; source it as a SourcedClaim or rewrite without the comparison",
  },
  {
    id: "priority-claim",
    category: "B",
    pattern: /\b(first (country|currency|nation|to)|pioneer\w*|unique(ly)?)\b/i,
    why: "'first'/'unique' claims need a source; rewrite or move to a SourcedClaim",
  },
  {
    id: "primacy",
    category: "B",
    pattern: /\bthe (centre|center|anchor|hub)\b/i,
    why: "'the centre / the anchor' asserts primacy; use 'a centre' or source it",
  },
  {
    id: "comparison",
    category: "B",
    pattern: /\b(more|less|smaller|larger|bigger|higher|lower|cheaper|better|worse)\b[^.]{0,40}?(?<!rather )\bthan\b/i,
    why: "comparisons need a source; rewrite or move to a SourcedClaim",
  },
  {
    id: "unsourced-figure",
    category: "B",
    pattern: /\d/,
    why: "figures are published only as SourcedClaims (source, asOf, reviewedOn, reviewedBy)",
  },
  {
    id: "investment-call",
    category: "C",
    pattern: /\b(historically cheap|undervalued|overvalued|opportunity to|buy signal|increase (silver|gold) exposure)\b/i,
    why: "no investment advice",
  },
]

// [record.field, rule id, reason]. Every entry is a known, listed exception.
// Every entry is a known, listed exception with an explicit category:
//   historical-constant — a fixed date or legal ratio from the past; it does
//                         not go stale (not a volatile statistic awaiting a source)
//   physical-property   — a property of matter; does not change over time
//   pending-source      — a claim kept until a SourcedClaim exists (none today)
type AllowCategory = "historical-constant" | "physical-property" | "pending-source"
interface AllowEntry {
  where: string
  rule: string
  category: AllowCategory
  reason: string
}
const HISTORICAL = "historical constant: a fixed date/ratio from the past that does not go stale"
const ALLOWLIST: AllowEntry[] = [
  { where: "METAL_INFO.XAG.funFact", rule: "numberless-ranking", category: "physical-property", reason: "silver has the highest electrical conductivity of any metal — a property of the element, not a market ranking" },
  { where: "CURRENCY_INFO.EUR.funFact", rule: "unsourced-figure", category: "historical-constant", reason: `1999 / 2002 euro introduction — ${HISTORICAL}` },
  { where: "CURRENCY_INFO.CHF.funFact", rule: "unsourced-figure", category: "historical-constant", reason: `1934 banking law — ${HISTORICAL}` },
  { where: "CURRENCY_INFO.TRY.funFact", rule: "unsourced-figure", category: "historical-constant", reason: `2005 redenomination (1,000,000 → 1) — ${HISTORICAL}` },
  { where: "CURRENCY_INFO.CNY.description", rule: "unsourced-figure", category: "historical-constant", reason: `2016 SDR inclusion — ${HISTORICAL}` },
  { where: "CURRENCY_INFO.INR.funFact", rule: "unsourced-figure", category: "historical-constant", reason: `2010 rupee symbol — ${HISTORICAL}` },
  { where: "CURRENCY_INFO.BRL.description", rule: "unsourced-figure", category: "historical-constant", reason: `1994 Real Plan — ${HISTORICAL}` },
  { where: "CURRENCY_INFO.BRL.funFact", rule: "unsourced-figure", category: "historical-constant", reason: `1994 Real Plan — ${HISTORICAL}` },
  { where: "CURRENCY_INFO.SEK.funFact", rule: "unsourced-figure", category: "historical-constant", reason: `1668 Riksbank founding — ${HISTORICAL}` },
  { where: "GOLD_SILVER_RATIO_INFO.funFact", rule: "unsourced-figure", category: "historical-constant", reason: `1792 Coinage Act, 15:1 — ${HISTORICAL}` },
]

function editorialFields(): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = []
  for (const [code, c] of Object.entries(CURRENCY_INFO)) {
    out.push({ where: `CURRENCY_INFO.${code}.description`, text: c.description })
    out.push({ where: `CURRENCY_INFO.${code}.economy`, text: c.economy })
    c.factors.forEach((f, i) => out.push({ where: `CURRENCY_INFO.${code}.factors[${i}]`, text: f }))
    if (c.funFact !== undefined) out.push({ where: `CURRENCY_INFO.${code}.funFact`, text: c.funFact })
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
      if (ALLOWLIST.some((a) => a.where === where && a.rule === rule.id)) continue
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
  for (const { where, rule: id, category, reason } of ALLOWLIST) {
    assert.ok(reason.length > 10, `${where}/${id}: allowlist entry needs a reason`)
    assert.ok(["historical-constant", "physical-property", "pending-source"].includes(category), `${where}: unknown category ${category}`)
    const field = editorialFields().find((f) => f.where === where)
    const rule = RULES.find((r) => r.id === id)
    assert.ok(field && rule && rule.pattern.test(field.text), `${where}/${id}: allowlist entry no longer matches anything`)
  }
  const byCategory = ALLOWLIST.reduce<Record<string, number>>((m, a) => ((m[a.category] = (m[a.category] ?? 0) + 1), m), {})
  console.log(`    allowlist: ${ALLOWLIST.length} entries — ${Object.entries(byCategory).map(([k, n]) => `${k} ${n}`).join(", ")}`)
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
    "numberless-ranking": "the dollar is the most held reserve currency",
    "priority-claim": "Australia was the first country to adopt polymer notes",
    primacy: "London is the centre of the gold market",
    comparison: "silver is more volatile than gold",
    "unsourced-figure": "introduced in 1999",
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
  // A key with no review entry stands in for an unreviewed record.
  assert.equal(editorialReviewDate(["USD", "NOT_REVIEWED"]), null)
  assert.match(editorialReviewLabel(["USD", "NOT_REVIEWED"]), /review pending/)
})

test("review dates are real ISO dates, not in the future, and drive the page label", () => {
  const today = new Date().toISOString().slice(0, 10)
  for (const [key, date] of Object.entries(EDITORIAL_REVIEWED)) {
    if (date === null) continue
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/, key)
    assert.ok(Number.isFinite(Date.parse(date)) && date <= today, `${key}: ${date}`)
  }
  assert.equal(editorialReviewLabel(["USD", "EUR"]), `Editorial content last reviewed: ${editorialReviewDate(["USD", "EUR"])}`)
})

test("EUR makes no member-count claim (the Bulgaria error class: counts go stale)", () => {
  assert.doesNotMatch(CURRENCY_INFO.EUR.description, /\b\d+ of the \d+\b/)
  assert.match(CURRENCY_INFO.EUR.description, /shared by many European Union member states/)
})

// --- Phase 5: source-backed claims ------------------------------------------

function allClaims(): Array<{ where: string; claim: SourcedClaim }> {
  const out: Array<{ where: string; claim: SourcedClaim }> = []
  for (const [code, c] of Object.entries(CURRENCY_INFO)) (c.claims ?? []).forEach((claim, i) => out.push({ where: `CURRENCY_INFO.${code}.claims[${i}]`, claim }))
  for (const [code, m] of Object.entries(METAL_INFO)) (m.claims ?? []).forEach((claim, i) => out.push({ where: `METAL_INFO.${code}.claims[${i}]`, claim }))
  return out
}

test("sourced claims: every published claim has source, period, review date and reviewer", () => {
  const claims = allClaims()
  const problems = claims.flatMap(({ where, claim }) => claimProblems(claim).map((p) => `${where}: ${p}`))
  console.log(`    sourced claims in content: ${claims.length}`)
  assert.deepEqual(problems, [])
})

test("sourced claims: validator requires all four fields (self-test)", () => {
  const ok: SourcedClaim = {
    text: "Example figure",
    source: { name: "Example statistics office", url: "https://example.org/report" },
    asOf: "2025-Q4",
    reviewedOn: "2026-10-22",
    reviewedBy: "site editor",
  }
  assert.deepEqual(claimProblems(ok, "2026-10-22"), [])
  assert.match(claimProblems({ ...ok, source: { name: "", url: "" } }, "2026-10-22").join(), /source.name.*source.url/)
  assert.match(claimProblems({ ...ok, asOf: "recently" }, "2026-10-22").join(), /asOf/)
  assert.match(claimProblems({ ...ok, reviewedOn: "2027-01-01" }, "2026-10-22").join(), /future/)
  assert.match(claimProblems({ ...ok, reviewedBy: " " }, "2026-10-22").join(), /reviewedBy/)
})

test("review log: every shown review date is backed by a log entry for that record", async () => {
  const { EDITORIAL_REVIEW_LOG } = await import("./editorial.ts")
  for (const [key, date] of Object.entries(EDITORIAL_REVIEWED)) {
    if (date === null) continue
    const covered = EDITORIAL_REVIEW_LOG.some(
      (e) => e.date === date && (e.records === "all" || e.records.includes(key))
    )
    assert.ok(covered, `${key}: shown review date ${date} has no matching log entry`)
  }
  for (const e of EDITORIAL_REVIEW_LOG) assert.ok(e.checked.length > 10 && e.reviewedBy.length > 3, `log entry ${e.date} is incomplete`)
})
