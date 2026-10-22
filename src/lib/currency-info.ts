// Explanatory text for the 15 currencies.
//
// Editorial policy (enforced by src/lib/editorial.test.ts):
//   - plain text carries no figures and no ranking/comparison assertions
//     ("third-largest", "most held", "leading", "oldest", "… than …"), with
//     or without numbers; such claims go in `claims` with source, period,
//     review date and reviewer (src/lib/claims.ts) — or are not published;
//   - no individual company names — sector and geography carry the meaning.
// Review dates and the review log live in src/lib/editorial.ts.

import type { SourcedClaim } from "./claims.ts"

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  country: string
  description: string
  economy: string
  factors: string[]
  funFact?: string // omitted when it would only repeat another block
  claims?: SourcedClaim[] // figures/rankings, only with source + period + review
}

export const CURRENCY_INFO: Record<string, CurrencyInfo> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    country: "United States",
    description:
      "The United States Dollar is widely used in international trade, finance and central bank reserves. Commodities such as gold and oil are priced in dollars, and many cross-border loans and bonds are denominated in dollars.",
    economy:
      "The United States is one of the world's major economies, with large and liquid financial markets. The Federal Reserve (Fed) manages monetary policy, and its interest rate decisions have a significant impact on the dollar's value globally.",
    factors: [
      "Federal Reserve interest rate decisions",
      "US employment and inflation data",
      "Global risk sentiment and safe-haven demand",
      "US trade balance and fiscal policy",
    ],
    funFact:
      "Several countries outside the United States use the US dollar as their own official currency, and many others keep their currency pegged to it — a practice known as dollarization.",
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    country: "European Union",
    description:
      "The Euro is the official currency of the euro area (Eurozone), shared by many European Union member states. It is one of the world's major trading and reserve currencies.",
    economy:
      "The euro area is one of the world's major economic blocs, anchored by economies such as Germany and France. The European Central Bank (ECB) sets a single monetary policy for all euro area members.",
    factors: [
      "ECB monetary policy and interest rates",
      "Economic performance of major Eurozone economies",
      "Political stability within the EU",
      "Eurozone inflation and employment data",
    ],
    funFact:
      "The Euro was introduced as an accounting currency in 1999 and physical euro coins and banknotes entered circulation in 2002.",
  },
  GBP: {
    code: "GBP",
    name: "British Pound Sterling",
    symbol: "£",
    country: "United Kingdom",
    description:
      "The British Pound Sterling is the official currency of the United Kingdom and one of the world's major traded currencies, with a history reaching back to Anglo-Saxon England.",
    economy:
      "The UK is one of Europe's major economies, with London serving as a global financial center. The Bank of England (BoE) sets monetary policy to meet the government's inflation target.",
    factors: [
      "Bank of England interest rate decisions",
      "UK economic data and trade policy",
      "London financial market sentiment",
      "UK inflation and housing market trends",
    ],
    funFact:
      "Sterling traces its origins to the silver pennies of Anglo-Saxon England — the name 'pound' comes from a pound weight of silver.",
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    country: "Japan",
    description:
      "The Japanese Yen is one of the world's major traded and reserve currencies. It is often treated as a safe-haven currency that investors turn to during times of global uncertainty.",
    economy:
      "Japan is one of the world's major economies and an exporter of automobiles, electronics, and machinery. The Bank of Japan (BoJ) kept interest rates exceptionally low for a long period, and its policy decisions are closely watched by currency markets.",
    factors: [
      "Bank of Japan monetary policy decisions",
      "Japan's trade balance and export data",
      "Global risk appetite and safe-haven flows",
      "USD/JPY carry trade dynamics",
    ],
    funFact:
      "The yen has no smaller unit in everyday circulation — there is no equivalent of cents or pence.",
  },
  CHF: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "Fr",
    country: "Switzerland",
    description:
      "The Swiss Franc is the official currency of Switzerland and Liechtenstein. It has a long reputation for stability and is widely treated as a safe-haven asset during financial turmoil.",
    economy:
      "Switzerland has a highly developed and stable economy, known for its banking sector, pharmaceuticals, and precision manufacturing. The Swiss National Bank (SNB) sets monetary policy and has at times intervened in currency markets to influence the franc's value.",
    factors: [
      "Swiss National Bank interventions and interest rates",
      "Global geopolitical uncertainty and safe-haven demand",
      "Swiss economic indicators and trade data",
      "EUR/CHF dynamics and European economic health",
    ],
    funFact:
      "Switzerland's banking secrecy laws, established in 1934, helped make the Swiss franc synonymous with financial stability and privacy.",
  },
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "$",
    country: "Canada",
    description:
      "The Canadian Dollar, often called the 'Loonie' after the loon bird on the one-dollar coin, is one of the reserve currencies held by central banks around the world. It is closely tied to commodity prices, especially oil.",
    economy:
      "Canada has a resource-rich economy with significant exports of crude oil, natural gas, and minerals. The Bank of Canada sets monetary policy independently from the US despite close economic ties.",
    factors: [
      "Crude oil and commodity prices",
      "Bank of Canada interest rate decisions",
      "US–Canada trade relations",
      "Canadian housing market and employment data",
    ],
  },
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "$",
    country: "Australia",
    description:
      "The Australian Dollar is one of the major currencies of the foreign exchange market. It is considered a commodity currency due to Australia's significant exports of iron ore, coal, and natural gas.",
    economy:
      "Australia is a major exporter of natural resources, with China as a key trading partner. The Reserve Bank of Australia (RBA) manages monetary policy.",
    factors: [
      "Iron ore and commodity prices",
      "Chinese economic demand and trade relations",
      "RBA interest rate decisions",
      "Australian employment and inflation data",
    ],
    funFact:
      "Australian banknotes are made of polymer (plastic) rather than paper, which makes them durable and waterproof.",
  },
  TRY: {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    country: "Turkey",
    description:
      "The Turkish Lira is the official currency of Turkey. Its history of high inflation and sharp exchange-rate swings makes it a closely watched emerging market currency in global forex markets.",
    economy:
      "Turkey has a large and diversified economy, strategically positioned between Europe and Asia. It is a major manufacturer and exporter of textiles, automotive parts, and agricultural products.",
    factors: [
      "Central Bank of Turkey interest rate decisions",
      "Turkish inflation rates and economic policy",
      "Geopolitical developments in the region",
      "Foreign investment flows and current account balance",
    ],
    funFact:
      "Turkey redenominated its currency in 2005, removing six zeros — so 1,000,000 old Turkish lira became 1 new Turkish lira.",
  },
  CNY: {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    country: "China",
    description:
      "The Chinese Yuan (also known as Renminbi) is the official currency of the People's Republic of China. It is used in international trade and was added to the IMF's SDR basket in 2016.",
    economy:
      "China is one of the world's major economies and a major global exporter. The People's Bank of China (PBoC) manages the yuan through a managed float exchange rate system.",
    factors: [
      "PBoC monetary policy and daily fixing rate",
      "US-China trade relations and tariffs",
      "Chinese GDP growth and manufacturing data",
      "Capital flow controls and internationalization policies",
    ],
    funFact:
      "The word 'yuan' literally means 'round' in Chinese, referring to the round shape of coins used in imperial China.",
  },
  INR: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    country: "India",
    description:
      "The Indian Rupee is the official currency of India and is managed by the Reserve Bank of India. Its exchange rate reflects India's large economy, its dependence on energy imports, and foreign investment flows.",
    economy:
      "India's economy is driven by IT services, pharmaceuticals, textiles, and a very large domestic consumer market.",
    factors: [
      "Reserve Bank of India interest rate and inflation targeting",
      "Crude oil prices (India is a major oil importer)",
      "Foreign direct investment and IT sector performance",
      "Indian monsoon season and agricultural output",
    ],
    funFact:
      "The Indian rupee symbol ₹ was officially adopted in 2010, designed by D. Udaya Kumar, combining the Devanagari letter 'Ra' and the Latin letter 'R'.",
  },
  BRL: {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    country: "Brazil",
    description:
      "The Brazilian Real is the official currency of Brazil, one of South America's major economies. It was introduced in 1994 as part of an economic stabilization plan that successfully curbed hyperinflation.",
    economy:
      "Brazil has a diverse economy with strong agricultural exports (soybeans, coffee, beef), significant oil reserves, and a growing services sector. The Central Bank of Brazil sets monetary policy.",
    factors: [
      "Brazilian interest rate (Selic rate) decisions",
      "Commodity prices, especially soybeans and iron ore",
      "Political stability and fiscal policy",
      "Global emerging market sentiment",
    ],
    funFact:
      "Before the Real was introduced in 1994, Brazil went through a long series of currency changes over the preceding decades as it battled chronic high inflation.",
  },
  KRW: {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    country: "South Korea",
    description:
      "The South Korean Won is the official currency of South Korea. It reflects an advanced, technology-driven economy, home to globally known electronics, automotive and shipbuilding industries.",
    economy:
      "South Korea is a major exporter of semiconductors, automobiles, ships, and electronics. Its economy transformed from war-torn to high-tech in what is often called the 'Miracle on the Han River.'",
    factors: [
      "Bank of Korea interest rate decisions",
      "Global semiconductor demand and tech sector trends",
      "North-South Korea geopolitical tensions",
      "Trade relations with China, US, and Japan",
    ],
  },
  SEK: {
    code: "SEK",
    name: "Swedish Krona",
    symbol: "kr",
    country: "Sweden",
    description:
      "The Swedish Krona is the official currency of Sweden. Despite being an EU member, Sweden has chosen to keep its own currency rather than adopt the Euro.",
    economy:
      "Sweden has a highly developed export-oriented economy, known for innovation, technology companies, and a strong welfare state. Major exports include machinery, vehicles, and telecommunications equipment.",
    factors: [
      "Riksbank (Swedish central bank) interest rates",
      "Swedish export performance and trade balance",
      "EU economic conditions and EUR/SEK dynamics",
      "Nordic regional economic trends",
    ],
    funFact:
      "Sweden's central bank, the Riksbank, was established in 1668.",
  },
  MXN: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "$",
    country: "Mexico",
    description:
      "The Mexican Peso is actively traded in global currency markets and is often used by investors as a liquid gauge of emerging-market sentiment.",
    economy:
      "Mexico has a large, diversified economy closely linked to the United States through trade and manufacturing. It is a major exporter of vehicles, electronics, and oil.",
    factors: [
      "Banxico (Bank of Mexico) interest rate decisions",
      "US–Mexico trade relations",
      "Oil prices and domestic oil production",
      "Remittance flows from the US to Mexico",
    ],
    funFact:
      "Silver coins minted in Mexico circulated far beyond its borders for centuries, serving as a trade currency across the Americas and Asia.",
  },
  SGD: {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "$",
    country: "Singapore",
    description:
      "The Singapore Dollar is the official currency of Singapore, a financial hub in Asia. The Monetary Authority of Singapore (MAS) manages monetary policy through the exchange rate rather than interest rates.",
    economy:
      "Singapore has a highly developed free-market economy known for its financial services, electronics manufacturing, and port operations.",
    factors: [
      "MAS exchange rate policy adjustments",
      "Global trade flows and port activity",
      "Regional Asian economic conditions",
      "Financial services sector performance",
    ],
  },
}
