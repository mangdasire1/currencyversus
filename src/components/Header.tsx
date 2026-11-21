import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { PV } from "./pilot/palette"
import { TR_NAV } from "@/lib/tr-pages"
import type { LanguageLink } from "@/lib/tr-pages"

// The site header, on every page: the logo (a link home) and the main menu —
// Currencies, Metals, Method — as plain <a href> in the static HTML.
//
// - It sits in the same column as the page's content (`width`), so the logo
//   lines up with the title and the menu with the content's right edge.
// - On narrow screens the menu wraps to its own row under the logo; no menu
//   script, every link at least 44 px tall.
// - The section the page belongs to is marked with aria-current.
// - Turkish pages (lang="tr") get the Turkish menu (src/lib/tr-pages.ts).
// - A page with a version in the other language shows a link to it, last in
//   the menu row, named in that language and marked with its lang.
//
// No source label here: the footers name the sources (ECB via Frankfurter,
// gold-api.com for metals).
export const NAV = [
  { key: "currencies", href: "/currencies/", label: "Currencies" },
  { key: "metals", href: "/metals/", label: "Metals" },
  { key: "method", href: "/method/", label: "Method" },
] as const

export type NavKey = (typeof NAV)[number]["key"]

// The content column each page uses (its <main> max width).
export type HeaderWidth = "max-w-6xl" | "max-w-4xl" | "max-w-3xl"

export function Header({
  width = "max-w-6xl",
  current,
  lang = "en",
  languageLink = null,
}: {
  width?: HeaderWidth
  current?: NavKey
  lang?: "en" | "tr"
  languageLink?: LanguageLink | null
}) {
  const nav = lang === "tr" ? TR_NAV : NAV
  return (
    <header className={`relative z-10 w-full ${width} mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-6`}>
      <Link href="/" className="flex items-center gap-2 min-h-[44px]">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: PV.raised, border: `1px solid ${PV.border}` }}>
          <TrendingUp className="w-4 h-4" style={{ color: PV.accentText }} aria-hidden="true" />
        </span>
        <span className="text-lg font-bold tracking-tight" style={{ color: PV.text, fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}>
          Currency<span style={{ color: PV.accentText }}>Versus</span>
        </span>
      </Link>
      <nav aria-label={lang === "tr" ? "Ana menü" : "Main"} className="w-full sm:w-auto -mx-3">
        <ul className="flex items-center">
          {nav.map(({ key, href, label }) => (
            <li key={key}>
              <Link
                href={href}
                aria-current={current === key ? "page" : undefined}
                className="inline-flex items-center min-h-[44px] min-w-[44px] px-3 text-sm underline-offset-4 hover:underline"
                style={{ color: current === key ? PV.text : PV.dim, fontWeight: current === key ? 600 : 400 }}
              >
                {label}
              </Link>
            </li>
          ))}
          {languageLink && (
            <li>
              {/* another root layout: a full page load either way, so a plain <a> */}
              <a
                href={languageLink.href}
                hrefLang={languageLink.lang}
                lang={languageLink.lang}
                className="inline-flex items-center min-h-[44px] min-w-[44px] px-3 text-sm underline underline-offset-4"
                style={{ color: PV.dim }}
              >
                {languageLink.label}
              </a>
            </li>
          )}
        </ul>
      </nav>
    </header>
  )
}
