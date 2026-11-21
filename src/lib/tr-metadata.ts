// Metadata of a Turkish pilot page (task C3): title, description, canonical
// and hreflang, and its own Turkish share image (/tr/<page>/share.png) for
// Open Graph and X. A page's openGraph replaces the layout's, so siteName and
// locale are given here too.
import type { Metadata } from "next"
import { alternatesFor } from "./tr-pages"
import { OG_SIZE } from "./og-card"
import { trCardFor } from "./share-image"

export async function trPageMetadata(path: string, title: string, description: string): Promise<Metadata> {
  const card = await trCardFor(path)
  const url = `https://currencyversus.com${path}`
  const image = { url: `${url}share.png`, width: OG_SIZE.width, height: OG_SIZE.height, alt: card.alt, type: "image/png" }
  return {
    title,
    description,
    alternates: alternatesFor(path),
    openGraph: { title, description, url, siteName: "CurrencyVersus", locale: "tr_TR", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  }
}
