export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  country: string
  description: string
  economy: string
  factors: string[]
  funFact: string
}

export const CURRENCY_INFO: Record<string, CurrencyInfo> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    country: "United States",
    description:
      "The United States Dollar is the world's primary reserve currency and the most traded currency in the foreign exchange market. It serves as the standard unit of currency in international markets for commodities such as gold and oil.",
    economy:
      "The US has the largest economy in the world by nominal GDP. The Federal Reserve (Fed) manages monetary policy, and its interest rate decisions have a significant impact on the dollar's value globally.",
    factors: [
      "Federal Reserve interest rate decisions",
      "US employment and inflation data",
      "Global risk sentiment and safe-haven demand",
      "US trade balance and fiscal policy",
    ],
    funFact:
      "About 60% of all foreign exchange reserves held by central banks worldwide are denominated in US dollars.",
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    country: "European Union",
    description:
      "The Euro is the official currency of the Eurozone, used by 20 of the 27 European Union member states. It is the second most traded currency in the world after the US Dollar.",
    economy:
      "The Eurozone represents one of the largest economic blocs globally, with Germany and France as its largest economies. The European Central Bank (ECB) sets monetary policy for all Eurozone members.",
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
      "The British Pound Sterling is the oldest currency still in use and the fourth most traded currency in the world. It is the official currency of the United Kingdom and its overseas territories.",
    economy:
      "The UK has one of the largest economies in Europe, with London serving as a major global financial center. The Bank of England (BoE) sets monetary policy and inflation targets.",
    factors: [
      "Bank of England interest rate decisions",
      "UK economic data and Brexit-related developments",
      "London financial market sentiment",
      "UK inflation and housing market trends",
    ],
    funFact:
      "The pound sterling has been in continuous use since its inception around 775 AD, making it over 1,200 years old.",
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    country: "Japan",
    description:
      "The Japanese Yen is the third most traded currency in the forex market and is widely used as a reserve currency. It is known as a safe-haven currency that investors flock to during times of global uncertainty.",
    economy:
      "Japan has the third-largest economy in the world and is a major exporter of automobiles, electronics, and technology. The Bank of Japan (BoJ) has maintained ultra-low interest rates for decades.",
    factors: [
      "Bank of Japan monetary policy and yield curve control",
      "Japan's trade surplus and export data",
      "Global risk appetite and safe-haven flows",
      "USD/JPY carry trade dynamics",
    ],
    funFact:
      "The yen has no subdivisions in circulation — unlike most currencies, there are no cents or pence equivalent.",
  },
  CHF: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "Fr",
    country: "Switzerland",
    description:
      "The Swiss Franc is the official currency of Switzerland and Liechtenstein. It is regarded as one of the world's most stable currencies and a safe-haven asset during financial turmoil.",
    economy:
      "Switzerland has a highly developed and stable economy, known for its banking sector, pharmaceuticals, and precision manufacturing. The Swiss National Bank (SNB) actively manages the franc's value.",
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
      "The Canadian Dollar, often called the 'Loonie' after the loon bird on the one-dollar coin, is the fifth most held reserve currency in the world. It is closely tied to commodity prices, especially oil.",
    economy:
      "Canada has a resource-rich economy with significant exports of crude oil, natural gas, and minerals. The Bank of Canada sets monetary policy independently from the US despite close economic ties.",
    factors: [
      "Crude oil and commodity prices",
      "Bank of Canada interest rate decisions",
      "US-Canada trade relations and USMCA",
      "Canadian housing market and employment data",
    ],
    funFact:
      "Canada's one-dollar coin features a common loon, which is why the Canadian dollar is nicknamed the 'Loonie.'",
  },
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "$",
    country: "Australia",
    description:
      "The Australian Dollar is the fifth most traded currency in the forex market. It is considered a commodity currency due to Australia's significant exports of iron ore, coal, and natural gas.",
    economy:
      "Australia has enjoyed decades of uninterrupted economic growth and is a major exporter of natural resources, particularly to China. The Reserve Bank of Australia (RBA) manages monetary policy.",
    factors: [
      "Iron ore and commodity prices",
      "Chinese economic demand and trade relations",
      "RBA interest rate decisions",
      "Australian employment and inflation data",
    ],
    funFact:
      "Australian banknotes are made of polymer (plastic) rather than paper, making them waterproof — Australia was the first country to adopt polymer notes.",
  },
  TRY: {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    country: "Turkey",
    description:
      "The Turkish Lira is the official currency of Turkey. It has experienced significant volatility in recent years, making it a closely watched emerging market currency in global forex markets.",
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
      "The Chinese Yuan (also known as Renminbi) is the official currency of the People's Republic of China. It has been increasingly used in international trade and was added to the IMF's SDR basket in 2016.",
    economy:
      "China has the second-largest economy in the world and is the largest global exporter. The People's Bank of China (PBoC) manages the yuan through a managed float exchange rate system.",
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
      "The Indian Rupee is the official currency of India, the world's most populous country. It is regulated by the Reserve Bank of India and has shown steady growth alongside India's expanding economy.",
    economy:
      "India has one of the fastest-growing major economies in the world, driven by IT services, pharmaceuticals, textiles, and a massive domestic consumer market.",
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
      "The Brazilian Real is the official currency of Brazil, the largest economy in South America. It was introduced in 1994 as part of an economic stabilization plan that successfully curbed hyperinflation.",
    economy:
      "Brazil has a diverse economy with strong agricultural exports (soybeans, coffee, beef), significant oil reserves, and a growing services sector. The Central Bank of Brazil sets monetary policy.",
    factors: [
      "Brazilian interest rate (Selic rate) decisions",
      "Commodity prices, especially soybeans and iron ore",
      "Political stability and fiscal policy",
      "Global emerging market sentiment",
    ],
    funFact:
      "Before the Real was introduced in 1994, Brazil had changed its currency eight times in less than a century due to chronic hyperinflation.",
  },
  KRW: {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    country: "South Korea",
    description:
      "The South Korean Won is the official currency of South Korea. It reflects one of Asia's most advanced and technology-driven economies, home to global giants like Samsung, Hyundai, and LG.",
    economy:
      "South Korea is a major exporter of semiconductors, automobiles, ships, and electronics. Its economy transformed from war-torn to high-tech in what is often called the 'Miracle on the Han River.'",
    factors: [
      "Bank of Korea interest rate decisions",
      "Global semiconductor demand and tech sector trends",
      "North-South Korea geopolitical tensions",
      "Trade relations with China, US, and Japan",
    ],
    funFact:
      "South Korea's economic transformation from one of the poorest countries in the 1960s to a top-15 global economy is one of the most remarkable growth stories in modern history.",
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
      "The Riksbank, Sweden's central bank, is the world's oldest central bank, established in 1668.",
  },
  MXN: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "$",
    country: "Mexico",
    description:
      "The Mexican Peso is the most traded currency in Latin America and among the most traded emerging market currencies globally. It is the eighth most traded currency in the world by daily turnover.",
    economy:
      "Mexico has a large, diversified economy closely linked to the United States through trade and manufacturing. It is a major exporter of vehicles, electronics, and oil.",
    factors: [
      "Banxico (Bank of Mexico) interest rate decisions",
      "US-Mexico trade relations and USMCA",
      "Oil prices and Pemex production data",
      "Remittance flows from the US to Mexico",
    ],
    funFact:
      "The Mexican peso was the first currency in the world to use the '$' sign, which was later adopted by the United States dollar.",
  },
  SGD: {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "$",
    country: "Singapore",
    description:
      "The Singapore Dollar is the official currency of Singapore, one of Asia's major financial hubs. The Monetary Authority of Singapore (MAS) uniquely manages monetary policy through the exchange rate rather than interest rates.",
    economy:
      "Singapore has a highly developed free-market economy known for its financial services, electronics manufacturing, and port operations. It consistently ranks among the world's most competitive economies.",
    factors: [
      "MAS exchange rate policy adjustments",
      "Global trade flows and port activity",
      "Regional Asian economic conditions",
      "Financial services sector performance",
    ],
    funFact:
      "Singapore manages its monetary policy through the exchange rate rather than interest rates — the MAS adjusts the Singapore dollar's trading band against a basket of currencies.",
  },
}
