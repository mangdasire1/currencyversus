import type { Metadata } from "next"
import { TrYearlyPage, trYearlyMetadata } from "@/components/yearly/TrYearlyPage"

// Turkish by-year page (task C2); content and checks: src/lib/by-year.ts.
const PATH = "/tr/dolar-tl/yillara-gore/"

export async function generateMetadata(): Promise<Metadata> {
  return trYearlyMetadata(PATH)
}

export default function Page() {
  return <TrYearlyPage path={PATH} />
}
