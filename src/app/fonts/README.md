# Self-hosted fonts

These files are loaded from the repository so the build does not download
anything from Google Fonts (a failed download used to fail `next build`).

| Family | Version | Axis | Files | Used for |
|---|---|---|---|---|
| Space Grotesk | 2.000 | wght 300–700 (site uses 400–700) | latin, latin-ext, vietnamese | headings, display |
| JetBrains Mono | 2.211 | wght 400–800 (site uses 400–600) | latin, latin-ext, vietnamese, greek, cyrillic, cyrillic-ext | numbers |
| DM Sans | 4.004 | wght 100–1000 (site uses 400–600) | latin, latin-ext | body text |

**Source:** the exact `.woff2` files Google Fonts (fonts.gstatic.com) served to
`next/font/google` for this site on 2026-11-08, one variable-font file per
subset, with the same `unicode-range`s. Upstream projects:

- Space Grotesk — https://github.com/floriankarsten/space-grotesk
- JetBrains Mono — https://github.com/JetBrains/JetBrainsMono
- DM Sans — https://github.com/googlefonts/dm-fonts

**License:** all three are under the SIL Open Font License 1.1; the license
texts (from https://github.com/google/fonts, `ofl/<family>/OFL.txt`) are
`OFL-spacegrotesk.txt`, `OFL-jetbrainsmono.txt` and `OFL-dmsans.txt`.
The files are unmodified (renamed only).

**How they are loaded:** `src/app/site-fonts.ts` loads and preloads the latin file
of each family with `next/font/local`; `fonts.css` declares the other subsets
(not preloaded, downloaded only when a page uses their characters) and the
metric-adjusted Arial fallbacks.

## Share images (`/<page>/share.png`, `/tr/<page>/share.png`)

The share images are drawn at build time by `next/og` (Satori), which cannot
read `.woff2`. They use `next/og`'s built-in font, **Geist Regular**, which
ships inside the `next` package
(`node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf`); no font file
is copied into this repository and nothing is downloaded while building.

- Upstream: https://github.com/vercel/geist-font — SIL Open Font License 1.1.
- Coverage: every Turkish letter (ç ğ ı İ ö ş ü and capitals), ▲ ▼, €, $,
  % and the dashes used on the cards. It has no ₺: Turkish pages and images
  write "TL".
- Guard: before drawing, `src/lib/share-image.tsx` looks every character of
  the card up in the font's cmap (`src/lib/glyphs.ts`). A missing glyph stops
  the build with its name (e.g. `"₺" U+20BA`) instead of letting the renderer
  fetch a font over the network.
