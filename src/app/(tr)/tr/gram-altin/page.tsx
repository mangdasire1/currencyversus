import type { Metadata } from "next"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { alternatesFor } from "@/lib/tr-pages"

// Turkish pilot page (task C3). Skeleton: the page's content comes in task 3.
const PATH = "/tr/gram-altin/"

export const metadata: Metadata = {
  title: "Gram altın kaç TL: spot fiyattan teorik değer | CurrencyVersus",
  description: "1 gram saf altının spot fiyattan TL karşılığı; kuyumcu fiyatı değildir.",
  alternates: alternatesFor(PATH),
  openGraph: { title: "Gram altın kaç TL: spot fiyattan teorik değer | CurrencyVersus", description: "1 gram saf altının spot fiyattan TL karşılığı; kuyumcu fiyatı değildir.", url: `https://currencyversus.com${PATH}` },
}

export default function GramAltinPage() {
  return <TrPageShell path={PATH} title="Gram altın" />
}
