import type { Metadata } from "next";

// Site-wide default metadata: what the root layout gave every page before the
// layouts were split into route groups (src/app/(en)/layout.tsx); the global
// 404 (src/app/global-not-found.tsx) uses it too, as it did.
export const SITE_METADATA: Metadata = {
  // Absolute URLs for file-based metadata (the pair pages' share images)
  metadataBase: new URL("https://currencyversus.com"),
  title: "CurrencyVersus — Compare World Currencies",
  description:
    "Compare 15 major world currencies including USD, EUR, GBP, TRY, and more using the latest published European Central Bank reference rates, updated each business day, plus gold, silver, platinum and palladium prices. Historical trends span up to 10 years.",
  keywords:
    "currency converter, exchange rate, forex, USD, EUR, TRY, currency comparison",
  alternates: {
    canonical: "https://currencyversus.com",
  },
  openGraph: {
    title: "CurrencyVersus — Compare World Currencies",
    description: "Daily ECB reference rates with up to 10 years of history, plus gold, silver, platinum and palladium prices.",
    url: "https://currencyversus.com",
    siteName: "CurrencyVersus",
    type: "website",
    images: [
      {
        url: "https://currencyversus.com/logo.png",
        width: 1200,
        height: 630,
        alt: "CurrencyVersus — Compare World Currencies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CurrencyVersus — Compare World Currencies",
    description: "Daily ECB reference rates with up to 10 years of history, plus gold, silver, platinum and palladium prices.",
    images: ["https://currencyversus.com/logo.png"],
  },
};
