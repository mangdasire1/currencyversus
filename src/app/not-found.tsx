import Link from "next/link"
import { TrendingUp } from "lucide-react"

const QUICK_PAIRS = [
  { base: "USD", target: "EUR", label: "USD → EUR" },
  { base: "USD", target: "TRY", label: "USD → TRY" },
  { base: "EUR", target: "GBP", label: "EUR → GBP" },
  { base: "USD", target: "JPY", label: "USD → JPY" },
  { base: "EUR", target: "TRY", label: "EUR → TRY" },
  { base: "USD", target: "CNY", label: "USD → CNY" },
]

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.12) 0%, #080810 60%)",
      }}
    >
      {/* Header */}
      <header className="flex items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30">
            <TrendingUp className="w-4 h-4 text-[#6366f1]" />
          </div>
          <span
            className="text-xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Currency<span className="text-[#6366f1]">Versus</span>
          </span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8 text-center">
        <div className="flex flex-col gap-3">
          <p className="text-6xl font-bold font-mono text-[#6366f1]">404</p>
          <h1
            className="text-2xl md:text-3xl font-bold text-white"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Page not found
          </h1>
          <p className="text-slate-400 text-sm max-w-xs mx-auto" style={{ fontFamily: "var(--font-dm-sans)" }}>
            This currency pair doesn&apos;t exist or the page has moved.
          </p>
        </div>

        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5254cc] transition-colors text-white text-sm font-semibold font-mono"
        >
          ← Back to homepage
        </Link>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Popular pairs</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PAIRS.map(({ base, target, label }) => (
              <Link
                key={`${base}-${target}`}
                href={`/${base.toLowerCase()}-vs-${target.toLowerCase()}`}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#6366f1]/40 hover:bg-[#6366f1]/10 transition-all text-xs font-mono text-slate-300 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-slate-700 font-mono">
        CurrencyVersus · Data from ECB via Frankfurter API
      </footer>
    </div>
  )
}
