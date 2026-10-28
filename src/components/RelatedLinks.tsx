import Link from "next/link"
import type { RelatedLink } from "@/lib/related"
import { PV, SANS } from "@/components/pilot/palette"

// Plain <a href> links with descriptive text (next/link renders an anchor).
export function RelatedLinks({ links }: { links: RelatedLink[] }) {
  if (links.length === 0) return null
  return (
    <nav aria-labelledby="related-heading" className="flex flex-col gap-3">
      <h2 id="related-heading" className="text-lg font-semibold" style={{ ...SANS, color: PV.text }}>
        Related comparisons
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-center min-h-[44px] px-4 py-2 rounded-xl text-sm underline-offset-4 hover:underline"
              style={{ background: PV.surface, border: `1px solid ${PV.border}`, color: PV.accentText }}
            >
              {l.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Footer link to the method page.
export function MethodFooterLink() {
  return (
    <Link href="/method/" className="underline underline-offset-4 inline-flex items-center min-h-[44px] px-1" style={{ color: PV.dim }}>
      How we source and calculate the figures
    </Link>
  )
}
