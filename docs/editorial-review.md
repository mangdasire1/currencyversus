# Editorial review — which user question each block answers

Review date: 2026-10-22 (Phase 5). Reviewed by: Claude Code (AI assistant) at the
site owner's request — not an independent fact-check. Rules: `src/lib/claims.ts`,
guard: `src/lib/editorial.test.ts`, review log: `src/lib/editorial.ts`.

A block is worth keeping if it answers a question a visitor to that page plausibly
has. Blocks marked **no clear question** are candidates for removal or rewriting —
decision pending with the site owner; nothing was deleted.

## Currencies (`src/lib/currency-info.ts`)

| Block | Question it answers |
|---|---|
| USD.description | Why does the dollar matter beyond the US (trade, reserves, commodity pricing)? |
| USD.economy | Who sets US monetary policy and why does it move the dollar worldwide? |
| USD.factors | What usually moves the dollar? |
| USD.funFact | Do other countries use or peg to the dollar? |
| EUR.description | What is the euro and where is it used? |
| EUR.economy | Who sets euro monetary policy and which economies anchor it? |
| EUR.factors | What usually moves the euro? |
| EUR.funFact | When was the euro introduced (accounting vs. cash)? |
| GBP.description | What is sterling and how old is it (in general terms)? |
| GBP.economy | Who sets UK monetary policy and what role does London play? |
| GBP.factors | What usually moves the pound? |
| GBP.funFact | Where do the names "sterling" and "pound" come from? |
| JPY.description | Why is the yen treated as a safe haven? |
| JPY.economy | What drives Japan's economy and why is BoJ policy watched? |
| JPY.factors | What usually moves the yen (incl. carry trade)? |
| JPY.funFact | Why are yen prices whole numbers (no cents)? |
| CHF.description | Where is the franc used and why is it seen as a safe haven? |
| CHF.economy | What is Switzerland's economy built on and does the SNB intervene? |
| CHF.factors | What usually moves the franc? |
| CHF.funFact | Where does the franc's reputation for stability and privacy come from? |
| CAD.description | Why is the Canadian dollar called the Loonie and why does it follow oil? |
| CAD.economy | What does Canada export and how independent is its central bank? |
| CAD.factors | What usually moves the Canadian dollar? |
| CAD.funFact | **no clear question** — repeats the "Loonie" explanation already in the description |
| AUD.description | Why is the Australian dollar called a commodity currency? |
| AUD.economy | What does Australia export and to whom? |
| AUD.factors | What usually moves the Australian dollar? |
| AUD.funFact | What are Australian banknotes made of? |
| TRY.description | Why is the lira closely watched (inflation, exchange-rate swings)? |
| TRY.economy | What does the Turkish economy produce and export? |
| TRY.factors | What usually moves the lira? |
| TRY.funFact | Why do old lira amounts have six more zeros? |
| CNY.description | What is the renminbi and is it an international reserve currency? |
| CNY.economy | How is the yuan's exchange rate managed? |
| CNY.factors | What usually moves the yuan (incl. the daily fixing)? |
| CNY.funFact | What does "yuan" mean? |
| INR.description | Who manages the rupee and what shapes its exchange rate? |
| INR.economy | What drives India's economy? |
| INR.factors | What usually moves the rupee (incl. oil and monsoon)? |
| INR.funFact | Where does the ₹ symbol come from? |
| BRL.description | Where does the real come from (stabilisation plan)? |
| BRL.economy | What does Brazil export and who sets its monetary policy? |
| BRL.factors | What usually moves the real (incl. the Selic rate)? |
| BRL.funFact | Why did Brazil change currencies so often before the real? |
| KRW.description | What kind of economy stands behind the won? |
| KRW.economy | What does South Korea export? |
| KRW.factors | What usually moves the won? |
| KRW.funFact | **no clear question** — repeats the growth story already in the economy block ("Miracle on the Han River") |
| SEK.description | Why does Sweden, an EU member, not use the euro? |
| SEK.economy | What does Sweden export? |
| SEK.factors | What usually moves the krona? |
| SEK.funFact | How old is Sweden's central bank? |
| MXN.description | Why is the peso watched by emerging-market investors? |
| MXN.economy | How is Mexico's economy linked to the US? |
| MXN.factors | What usually moves the peso (incl. remittances)? |
| MXN.funFact | Has Mexican silver money circulated internationally? |
| SGD.description | How does Singapore run monetary policy (exchange-rate band)? |
| SGD.economy | What is Singapore's economy built on? |
| SGD.factors | What usually moves the Singapore dollar? |
| SGD.funFact | **no clear question** — repeats the exchange-rate policy already in the description |

## Metals (`src/lib/metal-info.ts`)

| Block | Question it answers |
|---|---|
| XAU.description | Why is gold held as a store of value, and what roles does it play today? |
| XAU.factors | What usually moves the gold price? |
| XAU.funFact | Why is old gold still around (durability, recycling)? |
| XAG.description | How is silver different from gold (precious and industrial)? |
| XAG.factors | What usually moves the silver price? |
| XAG.funFact | Why is silver hard to replace in electronics? |
| XAU.localContext.USD | Why is the gold price quoted in dollars, and how does the dollar affect it? |
| XAU.localContext.EUR | Why do European investors follow the EUR gold price? |
| XAU.localContext.GBP | What role does London play in gold pricing? |
| XAU.localContext.JPY | How does the yen exchange rate change the local gold price? |
| XAU.localContext.CHF | Why is Switzerland relevant to gold, and what does a franc gold price combine? |
| XAU.localContext.CAD | How is Canada's mining sector linked to the CAD gold price? |
| XAU.localContext.AUD | Why does the AUD gold price reflect both gold and the Australian dollar? |
| XAU.localContext.TRY | Why is gold, especially gram gold, so common in Turkish saving? |
| XAU.localContext.CNY | Who sets the yuan gold benchmark and when does Chinese demand rise? |
| XAU.localContext.INR | When does Indian gold buying rise and why? |
| XAU.localContext.BRL | Why can the BRL gold price move when the dollar price does not? |
| XAU.localContext.KRW | How can Korean investors hold gold? |
| XAU.localContext.SEK | How can Swedish investors hold gold, and why use it as a krona hedge? |
| XAU.localContext.MXN | **no clear question** — "Mexico mines gold too" says little about the MXN gold price |
| XAU.localContext.SGD | Why is Singapore relevant for physical gold storage? |
| XAG.localContext.USD | Why is silver quoted in dollars and why can it move sharply? |
| XAG.localContext.EUR | Which European industries create silver demand? |
| XAG.localContext.GBP | What role does London play in silver pricing? |
| XAG.localContext.JPY | Which Japanese industries use silver? |
| XAG.localContext.CHF | **no clear question** — generic; adds little about the CHF silver price |
| XAG.localContext.CAD | How is Canada's mining sector linked to silver? |
| XAG.localContext.AUD | Where does Australia's silver come from? |
| XAG.localContext.TRY | Why is silver popular with Turkish retail savers? |
| XAG.localContext.CNY | Why does Chinese solar manufacturing matter for silver? |
| XAG.localContext.INR | What does India use silver for, and when does buying rise? |
| XAG.localContext.BRL | **no clear question** — generic sentence that would fit any currency |
| XAG.localContext.KRW | Which Korean industries use silver? |
| XAG.localContext.SEK | Why could Sweden's electrification matter for silver demand? |
| XAG.localContext.MXN | Why is silver especially relevant to Mexico's economy? |
| XAG.localContext.SGD | Why is Singapore relevant to silver (industry, storage)? |

## Gold/silver ratio

| Block | Question it answers |
|---|---|
| GOLD_SILVER_RATIO_INFO.description | What does the gold/silver ratio measure? |
| GOLD_SILVER_RATIO_INFO.historical | Was the ratio ever fixed, and how does it behave in a crisis? |
| GOLD_SILVER_RATIO_INFO.interpretation | What does a rising or falling ratio indicate — and what does it not say? |
| GOLD_SILVER_RATIO_INFO.funFact | When was the ratio fixed by law in the US? |

## Blocks with no clear question (6) — decision pending

CAD.funFact, KRW.funFact, SGD.funFact (each repeats another block on the same page),
XAU.localContext.MXN, XAG.localContext.CHF, XAG.localContext.BRL (generic, little
specific to that currency's metal price).

## Flagged, kept, needing a source (SourcedClaim) — decision pending

- XAG.description, XAG.factors[1]: silver "more volatile than" / "more sensitive to
  economic growth than" gold.
- Fixed historical figures: EUR.funFact (1999/2002), CHF.funFact (1934),
  TRY.funFact (2005, 1,000,000 → 1), CNY.description (2016), INR.funFact (2010),
  BRL.description + BRL.funFact (1994), SEK.funFact (1668),
  GOLD_SILVER_RATIO_INFO.funFact (1792, 15:1).
- Allowed as a physical property (not volatile): XAG.funFact "highest electrical
  conductivity of any metal".
