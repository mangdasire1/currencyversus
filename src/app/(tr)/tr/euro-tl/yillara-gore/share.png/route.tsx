import { trYearlyShareImage } from "@/lib/share-image"

// This page's Turkish share image, written to out/ at build time (task C2).
export const dynamic = "force-static"

export async function GET() {
  return trYearlyShareImage("/tr/euro-tl/yillara-gore/")
}
