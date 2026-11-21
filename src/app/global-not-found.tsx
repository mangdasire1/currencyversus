import { SITE_METADATA } from "./site-metadata";
import { SiteDocument } from "./site-document";
import NotFound from "./(en)/not-found";

// 404 for any unmatched URL (out/404.html). With more than one root layout
// there is no single layout to compose it from, so Next needs this file
// (experimental.globalNotFound in next.config.ts). Same document, metadata and
// content as the 404 before the split. Next adds the noindex meta itself, as
// it did then. Guarded by scripts/verify-404.mjs.
export const metadata = SITE_METADATA;

export default function GlobalNotFound() {
  return (
    <SiteDocument lang="en">
      <NotFound />
    </SiteDocument>
  );
}
