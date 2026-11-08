import { Coins } from "lucide-react"

// One drawn icon for both metals instead of the 🥇/🥈 medal emoji (a medal
// says "first place", not "gold", and emoji render differently per system).
// Decorative: the metal's name or code is always written next to it.
const TINT: Record<string, string> = { XAU: "#C9A227", XAG: "#AEB4BE", XPT: "#D5D9E0", XPD: "#B9B3A8" }

export function MetalIcon({ code, className = "w-5 h-5" }: { code: string; className?: string }) {
  return <Coins aria-hidden="true" className={`inline-block flex-shrink-0 ${className}`} style={{ color: TINT[code] ?? "#9AA1AE" }} />
}
