import type { Metadata } from "next"
import { TrPageShell } from "@/components/tr/TrPageShell"
import { alternatesFor } from "@/lib/tr-pages"

// Turkish pilot page (task C3). Skeleton: the page's content comes in task 3.
const PATH = "/tr/ons-altin/"

export const metadata: Metadata = {
  title: "Ons altın kaç dolar: troy ons spot fiyatı | CurrencyVersus",
  description: "Altının troy ons başına dolar cinsinden spot fiyatı.",
  alternates: alternatesFor(PATH),
  openGraph: { title: "Ons altın kaç dolar: troy ons spot fiyatı | CurrencyVersus", description: "Altının troy ons başına dolar cinsinden spot fiyatı.", url: `https://currencyversus.com${PATH}` },
}

export default function OnsAltinPage() {
  return <TrPageShell path={PATH} title="Ons altın" />
}
