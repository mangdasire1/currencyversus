import Link from "next/link"
import { Header } from "@/components/Header"
import type { HeaderWidth } from "@/components/Header"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PV, SANS } from "@/components/pilot/palette"
import { trPage, trCrumbs, languageLinkFor } from "@/lib/tr-pages"

// Frame of every Turkish pilot page: Turkish menu with the link to the
// English version, Turkish breadcrumb trail (and its BreadcrumbList), the H1,
// and a footer with the sources and the method page.
export function TrPageShell({
  path,
  title,
  width = "max-w-3xl",
  children,
}: {
  path: string // "/tr/dolar-tl/"
  title: React.ReactNode
  width?: HeaderWidth
  children?: React.ReactNode
}) {
  const page = trPage(path)
  return (
    <div className="plain-page min-h-screen flex flex-col" style={{ background: PV.bg, color: PV.text, ...SANS }}>
      <Header width={width} lang="tr" current={page.section} languageLink={languageLinkFor(path)} />

      <main className={`flex-1 w-full ${width} mx-auto px-4 pb-12 flex flex-col gap-8`}>
        <div className="flex flex-col gap-2">
          <Breadcrumbs crumbs={trCrumbs(path)} label="Sayfa yolu" />
          <h1 className="text-[28px] sm:text-4xl font-bold leading-tight">{title}</h1>
        </div>
        {children}
      </main>

      <footer className="text-center py-6 text-xs px-4 flex flex-col items-center" style={{ color: PV.faint }}>
        <span>CurrencyVersus · Veriler: ECB (Frankfurter API üzerinden) ve gold-api.com · Yalnızca bilgi amaçlıdır, yatırım tavsiyesi değildir</span>
        {page.section !== "method" && (
          <Link href="/tr/yontem/" className="underline underline-offset-4 inline-flex items-center min-h-[44px] px-1" style={{ color: PV.dim }}>
            Rakamlar nereden geliyor, nasıl hesaplanıyor
          </Link>
        )}
      </footer>
    </div>
  )
}
