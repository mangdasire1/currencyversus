import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { getWebApplicationSchema } from "@/lib/structured-data";
import { CacheJanitor } from "@/components/CacheJanitor";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CurrencyVersus — Compare World Currencies",
  description:
    "Compare exchange rates between 15 major world currencies including USD, EUR, GBP, TRY, and more. View real-time rates and historical trends spanning up to 10 years.",
  keywords:
    "currency converter, exchange rate, forex, USD, EUR, TRY, currency comparison",
  alternates: {
    canonical: "https://currencyversus.com",
  },
  openGraph: {
    title: "CurrencyVersus — Compare World Currencies",
    description: "Real-time currency comparison with historical data.",
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
    description: "Real-time currency comparison with historical data.",
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
