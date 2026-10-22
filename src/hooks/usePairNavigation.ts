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

export function usePairNavigation(base: string, target: string) {
  const router = useRouter()

  const go = useCallback(
    (nav: PairNavigation | null, picked?: string) => {
      if (!nav) return
      if (picked) rememberSwapNotice(nav, picked)
      router.push(nav.path)
    },
    [router]
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
