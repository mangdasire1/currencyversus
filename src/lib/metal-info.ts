// Explanatory text for gold, silver and the gold/silver ratio.
//
// Editorial policy (enforced by src/lib/editorial.test.ts):
//   - plain text carries no figures and no ranking/comparison assertions
//     ("second-largest producer", "leading", "most …", "… than …"), with or
//     without numbers; such claims go in `claims` with source, period,
//     review date and reviewer (src/lib/claims.ts) — or are not published;
//   - no individual company or fund names; no tax claims; no "cheap/
//     expensive" or other investment calls.
// Review dates and the review log live in src/lib/editorial.ts.

import type { SourcedClaim } from "./claims.ts"

export interface MetalInfo {
  code: "XAU" | "XAG"
  name: string
  symbol: string
  icon: string
  description: string
  factors: string[]
  funFact: string
  localContext: Record<string, string> // currencies without a specific context are left out
  claims?: SourcedClaim[] // figures/rankings, only with source + period + review
}

export const METAL_INFO: Record<"XAU" | "XAG", MetalInfo> = {
  XAU: {
    code: "XAU",
    name: "Gold",
    symbol: "Au",
    icon: "🥇",
    description:
      "Gold is a widely recognized store of value, held by central banks, investors, and individuals across every continent. Unlike fiat currencies, its supply cannot be expanded by a central bank — its scarcity and durability have made it a store of value and a basis for money throughout recorded history. Today, gold functions simultaneously as a financial asset, a safe-haven holding, and an industrial material.",
    factors: [
      "US Dollar strength — gold is priced in USD; a weaker dollar makes gold cheaper for foreign buyers",
      "Real interest rates — higher rates raise the opportunity cost of holding non-yielding gold",
      "Central bank buying and selling — official reserve managers hold large amounts of gold",
      "Geopolitical risk — wars, sanctions, and political uncertainty drive safe-haven demand",
      "Inflation expectations — gold is widely used as a long-term inflation hedge",
      "ETF flows — gold-backed exchange-traded funds buy and sell physical metal as investors move in and out",
    ],
    funFact:
      "Gold barely corrodes and is widely recycled, so gold mined centuries ago can still be in use today — in jewellery, bars, coins, electronics and central bank vaults.",
    localContext: {
      USD:
        "Gold is quoted internationally in US dollars per troy ounce, so the USD price is the reference from which gold prices in every other currency are derived. A weaker dollar tends to support the gold price, and a stronger dollar tends to weigh on it.",
      EUR:
        "European investors track the EUR gold price for portfolio diversification and as a hedge against ECB monetary policy. During eurozone debt crises and periods of quantitative easing, gold served as a key store of value for European savers.",
      GBP:
        "London is a centre of the global over-the-counter gold market, and the London benchmark gold price is used as a reference in many contracts worldwide. The UK's long history in bullion trading and vaulting makes the GBP gold price closely watched.",
      JPY:
        "For Japanese investors, gold priced in yen combines the metal's own movements with the yen's exchange rate, so a weaker yen can lift the local gold price even when the dollar price is flat. Japanese savers can hold gold through bullion dealers and exchange-listed funds.",
      CHF:
        "Switzerland is an important centre of gold refining, with several major refineries in the canton of Ticino. Because the Swiss franc is itself regarded as a safe haven, gold priced in francs is followed by investors seeking two forms of protection at once.",
      CAD:
        "Canada is a significant gold-producing country with a large mining sector, and Toronto is a major centre for mining finance. The CAD gold price therefore reflects both world gold prices and the health of Canada's resource industries.",
      AUD:
        "Australia is a significant gold producer, with major mining regions in Western Australia. Because gold is an important export, the AUD gold price reflects both international metal prices and the Australian dollar's commodity-driven swings.",
      TRY:
        "Gold has a deep cultural role in Turkey: it is a traditional gift at weddings and family occasions and a common way for households to save. Gram gold is widely used as a hedge against inflation and lira depreciation, and banks offer gold accounts alongside physical gold.",
      CNY:
        "China is both a major gold producer and a major source of gold demand. The Shanghai Gold Exchange publishes a yuan-denominated benchmark, and Chinese retail buying often rises around Lunar New Year and the wedding season.",
      INR:
        "India has a deep-rooted tradition of gold ownership, with strong cultural and religious significance attached to gold. Buying traditionally rises around Dhanteras, Diwali and the wedding season, making Indian demand an important seasonal factor in the gold market.",
      BRL:
        "Brazilian investors use gold as a hedge against currency risk and inflation. Because the real can swing sharply against the dollar, the BRL gold price can move significantly even when the dollar price of gold is stable.",
      KRW:
        "South Korean investors can hold gold through bank gold accounts, exchange-traded products and the Korea Exchange gold market. The country's large electronics industry also uses gold in components, linking local industry to global gold demand.",
      SEK:
        "Swedish investors can hold gold through physical bullion and exchange-traded products, and Sweden's central bank keeps gold among its reserves. When the krona weakens, gold priced in SEK tends to rise, which is why some Swedish savers treat gold as a currency hedge.",
      SGD:
        "Singapore is one of Asia's main precious-metals trading and storage hubs, and investors across Southeast Asia use its vaults to hold physical gold. The SGD gold price combines international gold prices with the Singapore dollar's managed exchange rate.",
    },
  },

  XAG: {
    code: "XAG",
    name: "Silver",
    symbol: "Ag",
    icon: "🥈",
    description:
      "Silver bridges the worlds of precious metals and industrial commodities. While it shares gold's monetary heritage as a store of value and safe haven, a large share of silver demand comes from industrial applications — solar panels, electronics, electric vehicles, medical devices, and more. Because a large part of its demand comes from industry, silver's price responds to manufacturing activity and the pace of the energy transition as well as to investment demand.",
    factors: [
      "Solar panel manufacturing — silver paste is used in photovoltaic cells, so growth in solar capacity adds to demand",
      "Industrial production cycles — much of silver demand comes from manufacturing, so the price also reacts to factory activity, not only to investment demand",
      "Gold prices — silver often moves with gold, but with larger swings in both directions",
      "US Dollar strength and real interest rates — same inverse relationship as gold",
      "Mining supply — much of the world's silver is produced as a by-product of copper, lead, and zinc mining, so supply responds slowly to silver prices",
      "EV and electronics manufacturing — silver's conductivity makes it hard to replace in many applications",
    ],
    funFact:
      "Silver has the highest electrical conductivity of any metal, which is why it remains in use in solar cells, EV components, electrical contacts and telecommunications equipment.",
    localContext: {
      USD:
        "Silver is quoted internationally in US dollars per troy ounce, and New York futures trading has a major influence on prices. Large flows can move the silver price sharply.",
      EUR:
        "European industrial silver demand is anchored by automotive and solar panel manufacturing. Germany's large manufacturing base uses significant amounts of silver, linking the EUR silver price to European industrial output cycles.",
      GBP:
        "London is a central hub of the global over-the-counter silver market, and the London benchmark silver price is a widely used reference for contracts around the world.",
      JPY:
        "Japan's electronics and components industries use silver in contacts, capacitors and conductive pastes, so Japanese industrial activity is one of the factors behind silver demand.",
      CAD:
        "Canada mines silver mostly alongside base metals and gold, and many mining companies with silver operations are listed in Canada. The CAD silver price therefore links global silver prices with Canada's resource sector.",
      AUD:
        "Australia produces silver mainly as a by-product of lead and zinc mining; the Broken Hill region in New South Wales is historically one of the country's best-known silver districts.",
      TRY:
        "Silver is affordable in small amounts, which makes it accessible to Turkish retail savers, and silver jewellery has a long tradition in Turkish craftsmanship. Borsa Istanbul has a precious metals market where silver is traded.",
      CNY:
        "China is a major source of silver demand, largely because of its very large solar-panel manufacturing industry, which makes Chinese industrial activity one of the key drivers of the silver market.",
      INR:
        "India imports much of the silver it uses for jewellery, silverware, religious items and industry. Silver buying typically rises around Diwali and the wedding season.",
      KRW:
        "South Korea's semiconductor and electronics industries use silver in components, linking Korean manufacturing activity to global silver demand.",
      SEK:
        "Sweden's push toward electrification and clean technology, including battery and electric-vehicle manufacturing, adds to industrial interest in silver, which is used in electrical components.",
      MXN:
        "Mexico has produced silver for centuries, and silver mining remains an important part of its economy and a source of dollar export revenue. That makes the peso/silver relationship especially relevant for Mexico.",
      SGD:
        "Singapore's electronics and semiconductor manufacturers use silver, and the city-state's role as a regional precious-metals trading and storage hub extends to silver as well as gold.",
    },
  },
}

export const GOLD_SILVER_RATIO_INFO = {
  title: "Gold/Silver Ratio",
  description:
    "The Gold/Silver Ratio (GSR) measures how many ounces of silver are required to purchase one ounce of gold. It is a widely followed, simple way to compare the prices of the two metals.",
  historical:
    "Under historical bimetallic standards, governments fixed the ratio by law. Since gold and silver have traded freely, the ratio has moved over a wide range, typically rising during periods of financial stress, when demand for gold as a safe haven outpaces demand for industrially sensitive silver.",
  interpretation: [
    "The ratio tends to rise in risk-off environments: gold usually outperforms silver during crises, as investment demand outweighs industrial demand",
    "The ratio tends to fall in risk-on, high-growth environments, when silver's industrial demand supports its price",
    "The ratio only compares the two metals with each other; it does not say whether either metal is cheap or expensive in absolute terms",
  ],
  funFact:
    "The US Coinage Act of 1792 fixed the gold/silver ratio at 15:1 by law. Such legally fixed ratios repeatedly broke down as the market prices of the two metals drifted apart.",
}
