import { trShareImage } from "@/lib/share-image"

// This page's Turkish share image, written to out/ at build time (task C3-4).
export const dynamic = "force-static"

export async function GET() {
  return trShareImage("/tr/ons-altin/")
}
