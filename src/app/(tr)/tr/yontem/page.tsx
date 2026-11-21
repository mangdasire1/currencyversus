import type { Metadata } from "next"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { alternatesFor } from "@/lib/tr-pages"

// Turkish pilot page (task C3). Skeleton: the page's content comes in task 3.
const PATH = "/tr/yontem/"

export const metadata: Metadata = {
  title: "Yöntem: kurlar ve fiyatlar nereden geliyor | CurrencyVersus",
  description: "CurrencyVersus'taki kurların ve metal fiyatlarının kaynağı ve hesaplanışı.",
  alternates: alternatesFor(PATH),
  openGraph: { title: "Yöntem: kurlar ve fiyatlar nereden geliyor | CurrencyVersus", description: "CurrencyVersus'taki kurların ve metal fiyatlarının kaynağı ve hesaplanışı.", url: `https://currencyversus.com${PATH}` },
}

export default function YontemPage() {
  return <TrPageShell path={PATH} title="Yöntem" />
}
