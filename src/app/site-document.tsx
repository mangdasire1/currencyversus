import "./fonts/fonts.css";
import "./globals.css";
import { getWebApplicationSchema } from "@/lib/structured-data";
import { CacheJanitor } from "@/components/CacheJanitor";
import { spaceGrotesk, jetbrainsMono, dmSans } from "./site-fonts";

// The <html> document every page is rendered in: the root layout's markup
// before the split into route groups, unchanged. Used by the English root
// layout (src/app/(en)/layout.tsx) and the global 404
// (src/app/global-not-found.tsx).
export function SiteDocument({
  lang,
  children,
}: Readonly<{
  lang: string;
  children: React.ReactNode;
}>) {
  const webAppSchema = getWebApplicationSchema()
  return (
    <html
      lang={lang}
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
