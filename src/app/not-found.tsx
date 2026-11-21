import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { PV, MONO, SANS } from "@/components/pilot/palette"
import { MethodFooterLink } from "@/components/RelatedLinks"

// 404 page, on the site's palette (src/components/pilot/palette.ts): plain
// background, no gradient; text at ≥4.5:1 — dim #9AA1AE and faint #868E9C on
// the background, white on the selected fill #4F46E5 (6.29:1). Links are real
// pages with the trailing slash and 44px targets.
const QUICK_PAIRS = [
  { slug: "usd-vs-eur", label: "USD → EUR" },
  { slug: "usd-vs-try", label: "USD → TRY" },
  { slug: "eur-vs-gbp", label: "EUR → GBP" },
  { slug: "usd-vs-jpy", label: "USD → JPY" },
  { slug: "eur-vs-try", label: "EUR → TRY" },
  { slug: "usd-vs-cny", label: "USD → CNY" },
]

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: PV.bg, color: PV.text, ...SANS }}>
      <header className="flex items-center px-4 sm:px-6 py-3">
        <Link href="/" className="flex items-center gap-2 min-h-[44px]">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: PV.raised, border: `1px solid ${PV.border}` }}>
            <TrendingUp className="w-4 h-4" style={{ color: PV.accentText }} aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Currency<span style={{ color: PV.accentText }}>Versus</span>
          </span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8 text-center">
        <div className="flex flex-col gap-3">
          <p className="text-6xl font-bold" style={{ ...MONO, color: PV.accentText }}>404</p>
          <h1 className="text-2xl md:text-3xl font-bold">Page not found</h1>
          <p className="text-sm max-w-xs mx-auto" style={{ color: PV.dim }}>
            This currency pair doesn&apos;t exist or the page has moved.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl text-sm font-semibold"
          style={{ ...MONO, background: PV.selectedFill, color: "#FFFFFF" }}
        >
          ← Back to homepage
        </Link>

        <nav aria-labelledby="popular-heading" className="flex flex-col gap-3 w-full max-w-sm">
          <h2 id="popular-heading" className="text-xs uppercase tracking-wider font-normal" style={{ ...MONO, color: PV.dim }}>
            Popular pairs
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {QUICK_PAIRS.map(({ slug, label }) => (
              <li key={slug}>
                <Link
                  href={`/${slug}/`}
                  className="flex items-center justify-center min-h-[44px] px-3 rounded-lg text-xs underline-offset-4 hover:underline"
                  style={{ ...MONO, background: PV.surface, border: `1px solid ${PV.border}`, color: PV.text }}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <footer className="text-center py-6 text-xs px-4 flex flex-col items-center" style={{ color: PV.faint }}>
        <span>CurrencyVersus · Data from ECB via Frankfurter API and gold-api.com</span>
        <MethodFooterLink />
      </footer>
    </div>
  )
}
