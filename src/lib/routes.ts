// The single route catalog for /[pair] pages. generateStaticParams and every
// selector navigation use it, so a selector can only ever lead to a page the
// build actually produced. Pure — tested with `node --test`.

import { CURRENCIES } from "./currencies.ts"

const CODES = CURRENCIES.map((c) => c.code)

// Metal codes ↔ URL slugs. Metal pages are metal-first ("gold-vs-usd"); the
// only metal/metal page is "gold-vs-silver".
export const METAL_SLUGS: Record<string, string> = { XAU: "gold", XAG: "silver" }
const SLUG_TO_METAL: Record<string, string> = Object.fromEntries(
  Object.entries(METAL_SLUGS).map(([code, slug]) => [slug, code])
)

export function codeToSlug(code: string): string {
  return METAL_SLUGS[code] ?? code.toLowerCase()
}

function slugToCode(slug: string): string {
  return SLUG_TO_METAL[slug] ?? slug.toUpperCase()
}

export function pairSlug(base: string, target: string): string {
  return `${codeToSlug(base)}-vs-${codeToSlug(target)}`
}

export function pairPath(base: string, target: string): string {
  return `/${pairSlug(base, target)}/`
}

// Every /[pair] page the build generates (241 = 210 currency pairs + 30 metal
// pages + gold-vs-silver).
export function routeCatalog(): string[] {
  const slugs: string[] = []
  for (const base of CODES) {
    for (const target of CODES) {
      if (base !== target) slugs.push(pairSlug(base, target))
    }
  }
  for (const metal of Object.keys(METAL_SLUGS)) {
    for (const currency of CODES) slugs.push(pairSlug(metal, currency))
  }
  slugs.push(pairSlug("XAU", "XAG"))
  return slugs
}

const CATALOG = new Set(routeCatalog())

export function isValidPairRoute(base: string, target: string): boolean {
  return CATALOG.has(pairSlug(base, target))
}

export function parsePairSlug(slug: string): { base: string; target: string } | null {
  const parts = slug.split("-vs-")
  if (parts.length !== 2 || !CATALOG.has(slug)) return null
  return { base: slugToCode(parts[0]), target: slugToCode(parts[1]) }
}

export interface PairNavigation {
  base: string
  target: string
  path: string
  swapped: boolean // same code chosen on both sides → the sides were exchanged
  reordered: boolean // only the reverse order exists (e.g. metal-first pages)
}

function resolve(base: string, target: string, swapped: boolean): PairNavigation | null {
  if (isValidPairRoute(base, target)) {
    return { base, target, path: pairPath(base, target), swapped, reordered: false }
  }
  if (isValidPairRoute(target, base)) {
    return { base: target, target: base, path: pairPath(target, base), swapped, reordered: true }
  }
  return null
}

// Where a selector change should navigate. Picking on one side the code that
// is already on the other side swaps the two sides (the user is read as
// "make this the base/target"), so A→A never produces a non-existent page.
export function navigateSelection(
  current: { base: string; target: string },
  side: "base" | "target",
  code: string
): PairNavigation | null {
  if (side === "base") {
    if (code === current.target) return resolve(code, current.base, true)
    return resolve(code, current.target, false)
  }
  if (code === current.base) return resolve(current.target, code, true)
  return resolve(current.base, code, false)
}

export function navigateSwap(current: { base: string; target: string }): PairNavigation | null {
  return resolve(current.target, current.base, false)
}
