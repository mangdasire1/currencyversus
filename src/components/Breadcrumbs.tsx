import Link from "next/link"
import type { Crumb } from "@/lib/breadcrumbs"
import { breadcrumbSchema } from "@/lib/breadcrumbs"
import { PV } from "./pilot/palette"

// Visible breadcrumb trail and its BreadcrumbList structured data, from the
// same list (src/lib/breadcrumbs.ts). The last step is the current page: text
// with aria-current, not a link. Earlier steps are real links, 44px tall.
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const last = crumbs.length - 1
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(crumbs)) }} />
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-1">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-x-1">
              {i < last ? (
                <>
                  <Link href={c.path} className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] underline underline-offset-4" style={{ color: PV.dim }}>
                    {c.name}
                  </Link>
                  <span aria-hidden="true" style={{ color: PV.faint }}>›</span>
                </>
              ) : (
                <span aria-current="page" className="inline-flex items-center min-h-[44px]" style={{ color: PV.text }}>
                  {c.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
