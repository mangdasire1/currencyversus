"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { navigateSelection, navigateSwap, pairPath } from "@/lib/routes"
import type { PairNavigation } from "@/lib/routes"

// Selector navigation shared by the pair layouts. All navigation goes through
// the route catalog: picking the code that is already on the other side swaps
// the sides, and no selection can lead to a page the build did not generate.

// One-line notice carried across the navigation when a same-currency pick was
// turned into a swap. sessionStorage, read once on the next page.
const SWAP_NOTICE_KEY = "cv_swap_notice"
const NOTICE_MS = 6000

function rememberSwapNotice(nav: PairNavigation, picked: string) {
  if (!nav.swapped) return
  try {
    sessionStorage.setItem(
      SWAP_NOTICE_KEY,
      JSON.stringify({ path: nav.path, text: `${picked} was already selected on the other side, so the two were swapped.` })
    )
  } catch {
    // storage unavailable — navigation still works, only the notice is lost
  }
}

function takeSwapNotice(path: string): string | null {
  try {
    const raw = sessionStorage.getItem(SWAP_NOTICE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(SWAP_NOTICE_KEY)
    const notice = JSON.parse(raw) as { path?: unknown; text?: unknown }
    return notice.path === path && typeof notice.text === "string" ? notice.text : null
  } catch {
    return null
  }
}

// What the new layout keeps when the user lands on the reverse pair (USD/TRY
// → TRY/USD): the chart period and the two-dates tool's date. Both mean the
// same thing in either direction. Amounts are not carried: 1,000 USD and
// 1,000 TRY are different quantities, so the next page starts from its own
// defaults ("1 TRY =", 100 TRY) with the currency code next to the number.
// sessionStorage, read once by the next page; no URL parameters.
export interface CarriedView {
  period: string
  date: string
}

const CARRY_KEY = "cv_carry_view"

function rememberView(path: string, view: CarriedView) {
  try {
    sessionStorage.setItem(CARRY_KEY, JSON.stringify({ path, ...view }))
  } catch {
    // storage unavailable — the next page shows its defaults
  }
}

export function takeCarriedView(path: string): CarriedView | null {
  try {
    const raw = sessionStorage.getItem(CARRY_KEY)
    if (!raw) return null
    sessionStorage.removeItem(CARRY_KEY)
    const v = JSON.parse(raw) as { path?: unknown; period?: unknown; date?: unknown }
    if (v.path !== path || typeof v.period !== "string" || typeof v.date !== "string") return null
    return { period: v.period, date: v.date }
  } catch {
    return null
  }
}

// carry: current view, kept only when the navigation lands on the reverse pair
// (swap button, or picking the code that is already on the other side).
export function usePairNavigation(base: string, target: string, carry?: () => CarriedView) {
  const router = useRouter()

  const go = useCallback(
    (nav: PairNavigation | null, picked?: string) => {
      if (!nav) return
      if (picked) rememberSwapNotice(nav, picked)
      if (carry && nav.path === pairPath(target, base)) rememberView(nav.path, carry())
      router.push(nav.path)
    },
    [router, carry, base, target]
  )

  const handleBaseChange = useCallback(
    (code: string) => go(navigateSelection({ base, target }, "base", code), code),
    [base, target, go]
  )

  const handleTargetChange = useCallback(
    (code: string) => go(navigateSelection({ base, target }, "target", code), code),
    [base, target, go]
  )

  const handleSwapNav = useCallback(() => go(navigateSwap({ base, target })), [base, target, go])

  const [swapNotice, setSwapNotice] = useState<string | null>(null)
  useEffect(() => {
    const text = takeSwapNotice(pairPath(base, target))
    if (!text) return
    setSwapNotice(text)
    const t = setTimeout(() => setSwapNotice(null), NOTICE_MS)
    return () => clearTimeout(t)
  }, [base, target])

  return { handleBaseChange, handleTargetChange, handleSwapNav, swapNotice }
}
