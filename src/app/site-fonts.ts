import localFont from "next/font/local";

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
export const spaceGrotesk = localFont({
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

export const jetbrainsMono = localFont({
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

export const dmSans = localFont({
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
