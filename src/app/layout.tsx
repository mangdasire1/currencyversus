import type { Metadata } from "next";
import localFont from "next/font/local";
import "./fonts/fonts.css";
import "./globals.css";
import { getWebApplicationSchema } from "@/lib/structured-data";
import { CacheJanitor } from "@/components/CacheJanitor";

// Self-hosted fonts (src/app/fonts/README.md): the same .woff2 files Google
// Fonts served through next/font/google, so a Google Fonts outage cannot fail
// the build. Only the latin file of each family is loaded here — it is the one
// next/font/google preloaded. The other subsets (latin-ext with ₺ ₹ ₩ and
// Turkish letters, Vietnamese, Greek, Cyrillic) are plain @font-face rules in
// fonts/fonts.css, downloaded only when a page uses those characters, as before.
// next/font/local names the font family after the variable (spaceGrotesk,
// jetbrainsMono, dmSans); fonts.css uses the same names (fonts.test.ts checks).
// next/font arguments must be literals, so the latin unicode-range (as Google
// Fonts served it) is repeated in each call.
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  variable: "--font-space-grotesk",
  // Google's fallback metrics, defined in fonts/fonts.css (next/font/local
  // would compute slightly different ones from the latin file alone)
  adjustFontFallback: false,
  fallback: ["Space Grotesk Fallback"],
  weight: "400 700",
  display: "swap",
  declarations: [
    { prop: "unicode-range", value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  variable: "--font-jetbrains-mono",
  // Google's fallback metrics, defined in fonts/fonts.css (next/font/local
  // would compute slightly different ones from the latin file alone)
  adjustFontFallback: false,
  fallback: ["JetBrains Mono Fallback"],
  weight: "400 600",
  display: "swap",
  declarations: [
    { prop: "unicode-range", value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
});

const dmSans = localFont({
  src: "./fonts/dm-sans-latin.woff2",
  variable: "--font-dm-sans",
  // Google's fallback metrics, defined in fonts/fonts.css (next/font/local
  // would compute slightly different ones from the latin file alone)
  adjustFontFallback: false,
  fallback: ["DM Sans Fallback"],
  weight: "400 600",
  display: "swap",
  declarations: [
    { prop: "unicode-range", value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
});

export const metadata: Metadata = {
  title: "CurrencyVersus — Compare World Currencies",
  description:
    "Compare 15 major world currencies including USD, EUR, GBP, TRY, and more using the latest published European Central Bank reference rates, updated each business day, plus gold and silver prices. Historical trends span up to 10 years.",
  keywords:
    "currency converter, exchange rate, forex, USD, EUR, TRY, currency comparison",
  alternates: {
    canonical: "https://currencyversus.com",
  },
  openGraph: {
    title: "CurrencyVersus — Compare World Currencies",
    description: "Daily ECB reference rates and gold/silver prices, with up to 10 years of history.",
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
    description: "Daily ECB reference rates and gold/silver prices, with up to 10 years of history.",
    images: ["https://currencyversus.com/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const webAppSchema = getWebApplicationSchema()
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${dmSans.variable} dark`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
        />
      </head>
      <body className="min-h-full antialiased">
        <CacheJanitor />
        {children}
      </body>
    </html>
  );
}
