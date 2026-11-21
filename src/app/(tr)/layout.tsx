import type { Metadata } from "next";
import { SiteDocument } from "../site-document";

// Root layout of the Turkish pilot pages (task C3): <html lang="tr">, the same
// document as the English site (fonts, styles, CacheJanitor) without the
// English WebApplication JSON-LD. Each page sets its own title, description,
// canonical and hreflang (src/lib/tr-pages.ts).
export const metadata: Metadata = {
  metadataBase: new URL("https://currencyversus.com"),
  openGraph: { siteName: "CurrencyVersus", locale: "tr_TR", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function TurkishRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SiteDocument lang="tr" webAppSchema={false}>
      {children}
    </SiteDocument>
  );
}
