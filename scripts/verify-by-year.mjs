// By-year pages in out/ (task C2). Fails the build on any problem.
//
// For each of the eight pages (src/lib/by-year.ts):
// - every year from the pair's first to the current one has its row in the
//   static HTML, newest first, the current year labelled as year to date;
// - the chart line is in the static HTML, one point per year;
// - the last complete year is recomputed here from the ECB's own euro rates,
//   requested separately, with plain arithmetic and no site formatter:
//   year-end (last publication day), mean of the daily cross rates, low and
//   high with their dates, change from the previous year-end; each figure
//   on the page must equal it to the last digit it shows;
// - the CSV (/<pair>/by-year.csv) carries the table's figures, row for row;
// - hreflang both ways on the two pairs with a Turkish page, none on the others;
// - its own share.png (complete 1200x630 PNG) in og:image and twitter:image;
// - breadcrumb trail: BreadcrumbList and the visible trail, the agreed names;
// - the change warning on every page, the TCMB note on the Turkish ones.
import fs from "node:fs"
import path from "node:path"

const SITE = "https://currencyversus.com"
const outDir = path.resolve(process.cwd(), process.argv[2] ?? "out")
const problems = []
let checks = 0
const ok = (cond, page, what) => { checks++; if (!cond) problems.push(`${page}: ${what}`) }

// Written out here, not imported from src/lib/by-year.ts: a wrong list there must fail too.
const PAGES = [
  { en: "/usd-vs-try/by-year/", tr: "/tr/dolar-tl/yillara-gore/", base: "USD", target: "TRY", first: 2005, trPair: "/tr/dolar-tl/", trName: "Dolar/TL" },
  { en: "/eur-vs-try/by-year/", tr: "/tr/euro-tl/yillara-gore/", base: "EUR", target: "TRY", first: 2005, trPair: "/tr/euro-tl/", trName: "Euro/TL" },
  { en: "/usd-vs-eur/by-year/", base: "USD", target: "EUR", first: 1999 },
  { en: "/eur-vs-gbp/by-year/", base: "EUR", target: "GBP", first: 1999 },
  { en: "/eur-vs-chf/by-year/", base: "EUR", target: "CHF", first: 1999 },
  { en: "/usd-vs-jpy/by-year/", base: "USD", target: "JPY", first: 1999 },
]
const WARNING = {
  en: "The yearly change compares two reference rates; it is not an investment return: it leaves out inflation, interest and costs.",
  tr: "Yıllık değişim iki referans kurunu karşılaştırır; bir yatırım getirisi değildir: enflasyonu, faizi ve masrafları hesaba katmaz.",
}

const decode = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
const text = (h) => decode(h.replace(/<script\b[\s\S]*?<\/script>/g, " ").replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
const read = (p) => { const f = path.join(outDir, p, "index.html"); return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null }

// Page numbers into machine form without the site's formatters: Turkish
// "1.234,5678" → "1234.5678"; dates "31.12.2025" → "2025-12-31"; changes
// "▲ +17.95% up" / "▲ +%17,95 yükseliş" → "17.95".
const machineNumber = (s, tr) => (tr ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""))
const machineDate = (s, tr) => (tr ? s.replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, "$3-$2-$1") : s)
function machineChange(s, tr) {
  if (s === "—") return ""
  const m = s.match(tr ? /([+-]?)%([\d.,]+)/ : /([+-]?)([\d,.]+)%/)
  return m ? `${m[1] === "+" ? "" : m[1]}${machineNumber(m[2], tr)}` : `?${s}`
}

// The table: one object per row, in page order.
function tableRows(h, tr) {
  const sec = h.match(/<section aria-labelledby="yearly-table-heading"[\s\S]*?<\/section>/)?.[0]
  const body = sec?.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1]
  if (!body) return null
  return [...body.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(([row]) => {
    const cells = [...row.matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((c) => c[2])
    const main = (c) => text(c.replace(/<span\b[^>]*class="block[^"]*"[^>]*>[\s\S]*?<\/span>/g, ""))
    const sub = (c) => text(c.match(/<span\b[^>]*class="block[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "")
    const change = text(cells[5].replace(/<span class="sr-only">[\s\S]*?<\/span>/g, "").replace(/<span aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, ""))
    return {
      year: Number(main(cells[0])),
      label: sub(cells[0]),
      end: machineNumber(main(cells[1]), tr), endDate: machineDate(sub(cells[1]), tr),
      average: machineNumber(main(cells[2]), tr),
      low: machineNumber(main(cells[3]), tr), lowDate: machineDate(sub(cells[3]), tr),
      high: machineNumber(main(cells[4]), tr), highDate: machineDate(sub(cells[4]), tr),
      change: machineChange(change, tr),
    }
  })
}

// The CSV, by column name
function csvRows(file) {
  if (!fs.existsSync(file)) return null
  const [head, ...lines] = fs.readFileSync(file, "utf8").trimEnd().split("\n")
  const cols = head.split(",")
  return lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])))
}

// --- independent figures for the last complete year -----------------------
const thisYear = new Date().getUTCFullYear()
const Y = thisYear - 1
async function euroRates() {
  const url = `https://api.frankfurter.dev/v1/${Y - 1}-12-01..${Y}-12-31?symbols=USD,TRY,GBP,CHF,JPY`
  let last
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (res.ok) {
        const json = await res.json()
        if (json.base === "EUR" && json.rates) return json.rates
        last = new Error("not the euro series")
      } else last = new Error(`HTTP ${res.status}`)
    } catch (e) { last = e }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw last
}
function independent(rates, base, target) {
  const leg = (day, c) => (c === "EUR" ? 1 : day[c])
  const days = Object.keys(rates).sort().map((d) => ({ d, r: leg(rates[d], target) / leg(rates[d], base) }))
  const year = days.filter((x) => x.d.startsWith(`${Y}-`))
  const before = days.filter((x) => x.d < `${Y}-01-01`).at(-1)
  let sum = 0, lo = year[0], hi = year[0]
  for (const x of year) { sum += x.r; if (x.r < lo.r) lo = x; if (x.r > hi.r) hi = x }
  const end = year.at(-1)
  return { end: end.r, endDate: end.d, average: sum / year.length, low: lo.r, lowDate: lo.d, high: hi.r, highDate: hi.d, change: (end.r / before.r - 1) * 100, days: year.length }
}
// a shown figure equals the true value to the last digit it shows
function sameToShownDigits(shown, value) {
  const decimals = (shown.split(".")[1] ?? "").length
  return Number.isFinite(Number(shown)) && Math.abs(Number(shown) - value) <= 0.5 * 10 ** -decimals * (1 + 1e-9)
}

let rates = null
try { rates = await euroRates() } catch (e) { problems.push(`ECB series for ${Y}: ${e.message} — the independent check could not run`) }

const checkedYears = []
for (const p of PAGES) {
  const csv = csvRows(path.join(outDir, p.en.replace(/\/by-year\/$/, "/by-year.csv")))
  ok(csv && csv.length > 0, p.en, "by-year.csv missing or empty")
  for (const [page, lang] of [[p.en, "en"], ...(p.tr ? [[p.tr, "tr"]] : [])]) {
    const h = read(page)
    if (!h) { problems.push(`${page}: missing from out/`); continue }
    const tr = lang === "tr"
    const rows = tableRows(h, tr)
    ok(rows && rows.length > 0, page, "no yearly table in the static HTML")
    if (!rows || !csv) continue

    // every year, newest first, the current one labelled
    const years = rows.map((r) => r.year)
    const want = Array.from({ length: thisYear - p.first + 1 }, (_, i) => thisYear - i)
    ok(JSON.stringify(years) === JSON.stringify(want), page, `years ${years[0]}…${years.at(-1)} (${years.length}), expected ${thisYear}…${p.first}`)
    ok(tr ? /^yıl başından \d{2}\.\d{2}\.\d{4}'(y?[ae])$/.test(rows[0].label) : /^year to \d{1,2} [A-Z][a-z]{2} \d{4}$/.test(rows[0].label), page, `current year label "${rows[0].label}"`)
    ok(rows[rows.length - 1].change === "", page, "first year has a change")
    // title states the years
    ok(decode(h.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").includes(`${p.first}–${thisYear}`), page, `title without ${p.first}–${thisYear}`)

    // chart line: one point per year
    const line = h.match(/<section aria-labelledby="yearly-chart-heading"[\s\S]*?<path d="(M[^"]+)"/)?.[1]
    ok(line && line.split(/ (?=L)/).length === rows.length, page, `chart line with ${line ? line.split(/ (?=L)/).length : 0} points for ${rows.length} years`)

    // CSV = table
    ok(csv.length === rows.length, page, `CSV ${csv.length} rows, table ${rows.length}`)
    rows.forEach((r, i) => {
      const c = csv[i] ?? {}
      const pairs = [[r.year, Number(c.year)], [r.end, c.year_end_rate], [r.endDate, c.year_end_date], [r.average, c.average], [r.low, c.low], [r.lowDate, c.low_date], [r.high, c.high], [r.highDate, c.high_date], [r.change, c.change_from_previous_year_end_pct]]
      const bad = pairs.filter(([a, b]) => String(a) !== String(b))
      if (bad.length) ok(false, page, `${r.year}: table ≠ CSV ${JSON.stringify(bad.slice(0, 3))}`)
      else checks++
    })

    // independent figures of the last complete year
    if (rates) {
      const ind = independent(rates, p.base, p.target)
      const row = rows.find((r) => r.year === Y)
      const csvRow = csv.find((c) => Number(c.year) === Y)
      ok(row, page, `no row for ${Y}`)
      if (row) {
        for (const k of ["end", "average", "low", "high", "change"]) ok(sameToShownDigits(row[k], ind[k]), page, `${Y} ${k}: page ${row[k]}, ECB series ${ind[k]}`)
        for (const k of ["endDate", "lowDate", "highDate"]) ok(row[k] === ind[k], page, `${Y} ${k}: page ${row[k]}, ECB series ${ind[k]}`)
        ok(Number(csvRow?.publication_days) === ind.days, page, `${Y}: ${csvRow?.publication_days} publication days, ECB series ${ind.days}`)
        if (lang === "en") checkedYears.push(`${p.base}/${p.target} ${Y}: year-end ${row.end} (${row.endDate}), average ${row.average}, low ${row.low}, high ${row.high}, change ${row.change}% ⇔ ${ind.end.toFixed(6)}, ${ind.average.toFixed(6)}, ${ind.low.toFixed(6)}, ${ind.high.toFixed(6)}, ${ind.change.toFixed(4)}%`)
      }
    }

    // hreflang: both ways on the paired pages, none on the others
    const alt = Object.fromEntries([...h.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"\/>/g)].map((m) => [m[1], m[2]]))
    const wantAlt = p.tr ? { en: `${SITE}${p.en}`, tr: `${SITE}${p.tr}`, "x-default": `${SITE}${p.en}` } : {}
    ok(JSON.stringify(alt) === JSON.stringify(wantAlt), page, `hreflang ${JSON.stringify(alt)}`)
    ok(h.includes(`<link rel="canonical" href="${SITE}${page}"/>`), page, "canonical is not the page itself")

    // share image
    const img = `${SITE}${page}share.png`
    ok(h.includes(`<meta property="og:image" content="${img}"/>`) && h.includes(`<meta name="twitter:image" content="${img}"/>`), page, "og:image / twitter:image is not its share.png")
    const png = path.join(outDir, page, "share.png")
    const b = fs.existsSync(png) ? fs.readFileSync(png) : Buffer.alloc(0)
    const isPng = b.length > 24 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ok(isPng && b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630 && b.subarray(b.length - 8, b.length - 4).toString("latin1") === "IEND", page, "share.png is not a complete 1200x630 PNG")

    // breadcrumbs: data and visible trail, the agreed names
    const crumbs = tr
      ? [["Ana sayfa", "/tr/"], [p.trName, p.trPair], ["Yıllara göre", p.tr]]
      : [["Home", "/"], ["Currencies", "/currencies/"], [`${p.base} to ${p.target}`, p.en.replace("by-year/", "")], ["By year", p.en]]
    const list = [...h.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => JSON.parse(m[1])).find((j) => j["@type"] === "BreadcrumbList")
    const got = list ? list.itemListElement.map((i) => `${i.position}|${i.name}|${i.item}`).join(" ") : "none"
    ok(got === crumbs.map(([n, u], i) => `${i + 1}|${n}|${SITE}${u}`).join(" "), page, `BreadcrumbList ${got}`)
    const nav = h.match(new RegExp(`<nav aria-label="${tr ? "Sayfa yolu" : "Breadcrumb"}"[\\s\\S]*?</nav>`))?.[0] ?? ""
    const links = [...nav.matchAll(/<a\b[^>]*?href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => `${m[2]}→${m[1]}`).join(" ")
    ok(links === crumbs.slice(0, -1).map(([n, u]) => `${n}→${u}`).join(" ") && text(nav).endsWith(crumbs.at(-1)[0]), page, `visible trail "${links}"`)

    // notes
    const t = text(h)
    ok(t.includes(WARNING[lang]), page, "no change warning")
    ok(tr ? /çoğunlukla TCMB kurudur.*farklı olabilir\. Bu sayfa TCMB kurunu göstermez\./.test(t) : !/TCMB/.test(t), page, tr ? "no TCMB note" : "TCMB note on an English page")
    ok(h.includes(`href="${p.en.replace(/\/by-year\/$/, "/by-year.csv")}" download`), page, "no CSV link")
    // the method note links the yearly paragraph of the method page, which exists
    const method = tr ? ["/tr/yontem/", "yillara-gore"] : ["/method/", "by-year"]
    ok(h.includes(`href="${method[0]}#${method[1]}"`) && (read(method[0]) ?? "").includes(`<p id="${method[1]}">`), page, `no link to ${method[0]}#${method[1]}, or no such paragraph`)
  }
}

console.log(`verify-by-year: ${PAGES.length + PAGES.filter((p) => p.tr).length} pages, ${checks} checks, ${problems.length} problem(s)`)
if (problems.length) console.log("  " + problems.slice(0, 20).join("\n  "))
for (const l of checkedYears) console.log(`    independent ${l}`)
if (problems.length) process.exit(1)
