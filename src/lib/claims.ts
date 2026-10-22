// Source-backed claims (editorial policy, Phase 5).
//
// Plain explanatory text (currency-info.ts / metal-info.ts) carries no
// figures and no ranking or comparison assertions. A figure, ranking or
// comparison may be published only as a SourcedClaim with all four of:
//   source     — who published the figure (name + URL)
//   asOf       — the period the figure describes ("2025", "2025-Q4", "2026-06")
//   reviewedOn — when we checked it against that source (YYYY-MM-DD)
//   reviewedBy — who checked it
// Missing any of them → the claim is not published. Validated by
// src/lib/editorial.test.ts.

export interface SourcedClaim {
  text: string
  source: { name: string; url: string }
  asOf: string
  reviewedOn: string
  reviewedBy: string
}

const AS_OF = /^\d{4}(-(Q[1-4]|\d{2}(-\d{2})?))?$/
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

// Empty array = publishable. Each string names a missing/invalid field.
export function claimProblems(c: Partial<SourcedClaim>, today = new Date().toISOString().slice(0, 10)): string[] {
  const problems: string[] = []
  if (!c.text || !c.text.trim()) problems.push("text is empty")
  if (!c.source?.name?.trim()) problems.push("source.name is missing")
  if (!c.source?.url || !/^https:\/\/\S+$/.test(c.source.url)) problems.push("source.url must be an https URL")
  if (!c.asOf || !AS_OF.test(c.asOf)) problems.push("asOf must be a period like 2025, 2025-Q4 or 2025-06")
  if (!c.reviewedOn || !ISO_DAY.test(c.reviewedOn) || !Number.isFinite(Date.parse(c.reviewedOn))) {
    problems.push("reviewedOn must be a YYYY-MM-DD date")
  } else if (c.reviewedOn > today) {
    problems.push("reviewedOn is in the future")
  }
  if (!c.reviewedBy?.trim()) problems.push("reviewedBy is missing")
  return problems
}
