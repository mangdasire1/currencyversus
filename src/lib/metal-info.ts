export interface MetalInfo {
  code: "XAU" | "XAG"
  name: string
  symbol: string
  icon: string
  description: string
  factors: string[]
  funFact: string
  localContext: Record<string, string>
}

export const METAL_INFO: Record<"XAU" | "XAG", MetalInfo> = {
  XAU: {
    code: "XAU",
    name: "Gold",
    symbol: "Au",
    icon: "🥇",
    description:
      "Gold is the world's most recognized store of value, held by central banks, investors, and individuals across every continent. Unlike fiat currencies, gold cannot be inflated away — its scarcity and durability have made it the foundation of monetary systems for over 5,000 years. Today, gold functions simultaneously as a financial asset, a safe-haven currency, and an industrial material.",
    factors: [
      "US Dollar strength — gold is priced in USD; a weaker dollar makes gold cheaper for foreign buyers",
      "Real interest rates — higher rates raise the opportunity cost of holding non-yielding gold",
      "Central bank purchases — emerging-market central banks increasingly diversify reserves into gold",
      "Geopolitical risk — wars, sanctions, and political uncertainty drive safe-haven demand",
      "Inflation expectations — gold is widely used as a long-term inflation hedge",
      "ETF flows — large gold-backed ETFs (GLD, IAU) directly affect global spot demand",
    ],
    funFact:
      "All the gold ever mined in human history would fit into roughly 3.5 Olympic swimming pools — about 208,000 metric tons total. Despite millennia of mining, only a small fraction has ever been lost.",
    localContext: {
      USD:
        "The US dollar gold price is the global benchmark. Gold is quoted in USD/oz on all major exchanges, and the London Bullion Market Association (LBMA) Fix — set twice daily in London — is the world's pricing reference.",
      EUR:
        "European investors track the EUR gold price for portfolio diversification and as a hedge against ECB monetary policy. During eurozone debt crises and periods of quantitative easing, gold served as a key store of value for European savers.",
      GBP:
        "London is home to the LBMA Gold Fix, the global pricing benchmark set twice daily by major bullion banks. The UK has the world's deepest gold market infrastructure, making it the largest wholesale trading center for physical gold.",
      JPY:
        "Yen-hedged gold ownership is a popular strategy in Japan, particularly during Bank of Japan ultra-loose monetary policy periods. Japanese investors have increasingly adopted gold ETFs listed on the Tokyo Stock Exchange as a currency and inflation hedge.",
      CHF:
        "Switzerland refines over 50% of the world's gold supply, with major refiners Valcambi, PAMP, and Argor-Heraeus all based in Ticino. Swiss franc-denominated gold benefits from the CHF's own safe-haven status, creating a dual-hedge appeal.",
      CAD:
        "Canada ranks among the top 10 gold-producing nations. Toronto-headquartered Barrick Gold and Agnico Eagle are two of the world's largest mining companies, making the CAD gold market closely tied to Canadian mining sector performance.",
      AUD:
        "Australia is the world's second-largest gold producer. The Super Pit in Kalgoorlie, Western Australia, is one of the largest open-pit mines globally. The AUD gold price reflects both international metal trends and Australia's significant mining output.",
      TRY:
        "Gold has a uniquely deep cultural role in Turkey. Gram gold is one of the most popular savings instruments among Turkish households, widely used as a hedge against inflation and lira depreciation. Domestic gold deposits in bank accounts run into the tens of billions of USD.",
      CNY:
        "China is simultaneously the world's largest gold producer and consumer. The Shanghai Gold Exchange (SGE) sets the CNY gold benchmark, and Chinese retail demand — peaking around Lunar New Year and weddings — is a major driver of global gold prices.",
      INR:
        "India is the world's second-largest gold consumer, with deep cultural and religious significance attached to gold. Buying peaks during Dhanteras and wedding season, making Indian demand one of the most consistent seasonal drivers of global gold markets.",
      BRL:
        "Brazilian investors use gold as a hedge against currency risk and inflation. The B3 exchange in São Paulo offers gold futures contracts, and gold held as a financial investment is exempt from the IOF (financial operations tax) in Brazil.",
      KRW:
        "South Korean investors access gold through ETFs and bank gold savings accounts. The Korea Exchange (KRX) lists gold funds, and Samsung Electronics — one of the world's largest gold consumers for electronics — directly links Korean industry to global gold demand.",
      SEK:
        "Swedish investors access gold primarily through Nasdaq Nordic-listed ETFs. The Riksbank holds gold reserves and has evaluated gold's role in modern central bank portfolios. Swedish savers view gold as a store of value when the krona weakens.",
      MXN:
        "Mexico is a significant gold producer alongside its dominant silver production, with companies like Fresnillo and Grupo Mexico mining both metals. The MXN/gold price reflects Mexico's position as a commodity-driven economy sensitive to USD/MXN exchange dynamics.",
      SGD:
        "Singapore has established itself as Asia's leading precious metals hub. Gold bars are exempt from Singapore's GST, making it a top-tier center for physical gold storage and trading across Southeast Asia, with vault capacity growing rapidly.",
    },
  },

  XAG: {
    code: "XAG",
    name: "Silver",
    symbol: "Ag",
    icon: "🥈",
    description:
      "Silver uniquely bridges the worlds of precious metals and industrial commodities. While it shares gold's monetary heritage as a store of value and safe haven, approximately half of silver demand comes from industrial applications — solar panels, electronics, electric vehicles, medical devices, and more. This dual role makes silver more volatile than gold but potentially more sensitive to economic growth cycles and the global energy transition.",
    factors: [
      "Solar panel manufacturing — silver paste is essential for photovoltaic cells; surging solar capacity drives demand",
      "Industrial production cycles — silver demand is more sensitive to economic growth than gold",
      "Gold/silver ratio — the historical mean-reversion tendency creates arbitrage opportunities",
      "US Dollar strength and real interest rates — same inverse relationship as gold",
      "Mining supply — 70% of silver is mined as a by-product of copper, lead, and zinc extraction",
      "EV and electronics manufacturing — silver's unmatched conductivity is irreplaceable in most applications",
    ],
    funFact:
      "Silver is the most electrically and thermally conductive element on Earth. Despite substitution attempts, no metal matches silver's combination of conductivity, workability, and cost — making it irreplaceable in solar cells, EV components, and 5G infrastructure.",
    localContext: {
      USD:
        "The COMEX in New York is the world's primary silver futures exchange, with prices denominated in USD/oz. The USD silver price is the global benchmark, and the silver market is significantly smaller and more volatile than gold, making it highly sensitive to large institutional moves.",
      EUR:
        "European industrial silver demand is anchored by automotive and solar panel manufacturing. Germany, as the EU's largest industrial economy, consumes significant silver in its manufacturing sectors, linking the EUR silver price to European industrial output cycles.",
      GBP:
        "London's silver market, operated by the LBMA, runs an electronic auction benchmark alongside its gold Fix. Growing UK solar installation and EV adoption targets are gradually increasing British industrial silver demand.",
      JPY:
        "Japan is a significant industrial silver consumer through its electronics manufacturing sector. Companies like Sony, Panasonic, and TDK use silver in capacitors, contacts, and conductive pastes. Japan's industrial health directly influences its silver demand.",
      CHF:
        "Swiss precision engineering and medical technology sectors consume industrial silver. Major Swiss pharmaceutical and medical device companies use silver for its antibacterial properties in medical-grade equipment and wound care products.",
      CAD:
        "Canada has significant silver mining operations, including First Majestic Silver's mines in British Columbia. Canadian silver production is both a domestic asset and a major export commodity, making the CAD/silver relationship tied to mining sector fortunes.",
      AUD:
        "Australia produces silver primarily as a by-product of lead and zinc mining, particularly in the Broken Hill region. BHP and South32 are among the major Australian companies generating silver output alongside base metal operations.",
      TRY:
        "Silver is more accessible than gold for Turkish retail savers, and silver jewelry consumption is notable in Turkish consumer culture. The Istanbul exchange facilitates silver trading, and growing Turkish solar energy investments may drive future industrial silver demand.",
      CNY:
        "China is the world's largest silver consumer, driven primarily by its massive solar panel manufacturing industry. Chinese solar capacity additions — the largest globally — directly translate into consistent silver demand growth, making China the single most important driver of the silver market.",
      INR:
        "India is one of the world's largest silver importers, using it extensively in solar panels, electronics, and traditional jewelry and temple artifacts. Indian silver demand spikes around Diwali and wedding seasons, with solar-related demand growing each year.",
      BRL:
        "Brazil's rapidly expanding solar energy sector is driving industrial silver demand. The Brazilian market also supports retail silver investment through ETFs and bank certificates. The BRL/silver price reflects both global metal trends and Brazil's energy transition pace.",
      KRW:
        "South Korea's semiconductor and electronics industries — including Samsung and SK Hynix — are significant silver consumers for component manufacturing. South Korea's ambitious renewable energy targets also indicate growing solar-related silver demand ahead.",
      SEK:
        "Sweden's transition to renewable energy, with major solar and EV investments by companies like Northvolt, is driving growing industrial silver demand. Swedish cleantech manufacturers represent a rising category of silver end-users.",
      MXN:
        "Mexico is the world's largest silver producer, with Fresnillo, Grupo Mexico, and Industrias Peñoles extracting over 200 million ounces annually. The peso/silver relationship is uniquely important — Mexico's mining industry is a pillar of its economy and a key source of dollar revenues.",
      SGD:
        "Singapore's electronics and semiconductor sectors consume industrial silver in manufacturing. The city-state also functions as a regional precious metals storage and trading hub, with silver vault capacity growing alongside gold as Asia's wealthiest households diversify into hard assets.",
    },
  },
}

export const GOLD_SILVER_RATIO_INFO = {
  title: "Gold/Silver Ratio",
  description:
    "The Gold/Silver Ratio (GSR) measures how many ounces of silver are required to purchase one ounce of gold. It is one of the most closely watched indicators in precious metals markets — a simple but powerful tool for assessing the relative value between the two metals.",
  historical:
    "Historically, the ratio has ranged from 16:1 (when the two metals were legally fixed by the US Bimetallic Standard) to over 120:1 during extreme market dislocations like the COVID-19 pandemic in March 2020. The long-term historical average since 1900 is approximately 65–70:1. The ratio tends to mean-revert over time: extreme readings have consistently attracted contrarian investors looking to rotate between the two metals.",
  interpretation: [
    "A high ratio (above 80) suggests silver is historically cheap relative to gold — potential opportunity to increase silver exposure",
    "A low ratio (below 50) suggests gold is historically cheap relative to silver — potential opportunity to shift toward gold",
    "The ratio rises in risk-off environments: gold outperforms silver during crises as investment demand outweighs industrial demand",
    "The ratio falls in risk-on, high-growth environments: silver's industrial component drives outperformance",
  ],
  funFact:
    "Ancient Roman law fixed the gold/silver ratio at 12:1. The US Coinage Act of 1792 set it at 15:1. Neither ratio held for long — free markets have consistently overridden political price-fixing attempts.",
}
