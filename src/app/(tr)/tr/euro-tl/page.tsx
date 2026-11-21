import type { Metadata } from "next"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { alternatesFor } from "@/lib/tr-pages"

// Turkish pilot page (task C3). Skeleton: the page's content comes in task 3.
const PATH = "/tr/euro-tl/"

export const metadata: Metadata = {
  title: "Euro/TL kuru: Avrupa Merkez Bankası (ECB) referans kuru | CurrencyVersus",
  description: "Euro/TL için Avrupa Merkez Bankası'nın (ECB) iş günlerinde yayımladığı referans kuru.",
  alternates: alternatesFor(PATH),
  openGraph: { title: "Euro/TL kuru: Avrupa Merkez Bankası (ECB) referans kuru | CurrencyVersus", description: "Euro/TL için Avrupa Merkez Bankası'nın (ECB) iş günlerinde yayımladığı referans kuru.", url: `https://currencyversus.com${PATH}` },
}

export default function EuroTlPage() {
  return <TrPageShell path={PATH} title="Euro / TL" />
}
