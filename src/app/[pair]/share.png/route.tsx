import { routeCatalog } from "@/lib/routes"
import { shareImage } from "@/lib/share-image"

// /<page>/share.png — the page's share image, prerendered into out/ as a PNG
// file (static export: GET only, force-static, every page from the route
// catalog). The .png name makes Cloudflare serve it as image/png.
export const dynamic = "force-static"

export async function generateStaticParams() {
  return routeCatalog().map((pair) => ({ pair }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params
  return shareImage(pair)
}
