import { trShareImage } from "@/lib/share-image"

// The Turkish home's share image, written to out/ at build time.
export const dynamic = "force-static"

export async function GET() {
  return trShareImage("/tr/")
}
