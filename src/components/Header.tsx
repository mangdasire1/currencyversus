import Link from "next/link"
import { TrendingUp } from "lucide-react"

// Home page header. It sits in the same container as the content (max-w-6xl,
// px-4), so the logo lines up with the title and the navigation with the
// right column. The links are plain <a href> in the static HTML; on narrow
// screens they wrap to their own row under the logo (no menu script), each at
// least 44 px tall.
//
// No source label here: the old "Powered by ECB data" was wrong for the metal
// prices (gold-api.com); the footer names both sources.
const NAV = [
  { href: "#currencies", label: "Currencies" },
  { href: "#metals", label: "Metals" },
  { href: "/method/", label: "Method" },
]

export function Header() {
  return (
    <header className="relative z-10 container mx-auto max-w-6xl px-4 pt-4 flex flex-wrap items-center justify-between gap-x-6">
      <div className="flex items-center gap-2 min-h-[44px]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30">
          <TrendingUp className="w-4 h-4 text-[#6366f1]" aria-hidden="true" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white font-heading">
          Currency<span className="text-[#6366f1]">Versus</span>
        </span>
      </div>
      <nav aria-label="Main" className="w-full sm:w-auto -mx-3">
        <ul className="flex items-center">
          {NAV.map(({ href, label }) => (
            <li key={href}>
              {href.startsWith("/") ? (
                <Link href={href} className="inline-flex items-center min-h-[44px] min-w-[44px] px-3 text-sm text-slate-300 hover:text-white hover:underline">
                  {label}
                </Link>
              ) : (
                <a href={href} className="inline-flex items-center min-h-[44px] min-w-[44px] px-3 text-sm text-slate-300 hover:text-white hover:underline">
                  {label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
