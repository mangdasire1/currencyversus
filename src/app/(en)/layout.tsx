import { SITE_METADATA } from "../site-metadata";
import { SiteDocument } from "../site-document";

// Root layout of the English site (every page but the global 404). The pages
// live in the (en) route group so that another group can have its own root
// layout with its own <html lang>; the group name is not part of any URL.
export const metadata = SITE_METADATA;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SiteDocument lang="en">{children}</SiteDocument>;
}
