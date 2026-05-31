import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

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
    "Compare exchange rates between 15 major world currencies. View current rates and historical trends over 10 years.",
  keywords:
    "currency converter, exchange rate, forex, USD, EUR, TRY, currency comparison",
  openGraph: {
    title: "CurrencyVersus — Compare World Currencies",
    description: "Real-time currency comparison with historical data.",
    url: "https://currencyversus.com",
    siteName: "CurrencyVersus",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${dmSans.variable} dark`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
