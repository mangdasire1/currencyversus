const fs = require("fs")
const path = require("path")

const CODES = [
  "USD","EUR","GBP","JPY","CHF","CAD","AUD","TRY",
  "CNY","INR","BRL","KRW","SEK","MXN","SGD",
]

const BASE_URL = "https://currencyversus.com"

const pairs = []
for (const base of CODES) {
  for (const target of CODES) {
    if (base !== target) {
      pairs.push(`${base.toLowerCase()}-vs-${target.toLowerCase()}`)
    }
  }
}

const urls = [
  `  <url>\n    <loc>${BASE_URL}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
  ...pairs.map(
    (pair) =>
      `  <url>\n    <loc>${BASE_URL}/${pair}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`
  ),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`

const outPath = path.join(__dirname, "..", "out", "sitemap.xml")
fs.writeFileSync(outPath, sitemap, "utf-8")
console.log(`✓ sitemap.xml generated with ${pairs.length + 1} URLs`)
