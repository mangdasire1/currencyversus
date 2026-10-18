export function getWebApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "CurrencyVersus",
    url: "https://currencyversus.com",
    applicationCategory: "FinanceApplication",
    description:
      "Compare 15 major world currencies including USD, EUR, GBP, TRY, and more using the latest published European Central Bank reference rates, updated each business day, plus gold and silver spot prices. Historical trends span up to 10 years.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    operatingSystem: "All",
  }
}

export function getFAQSchema(
  base: string,
  target: string,
  rate: number | null,
  date: string | null
) {
  const rateStr = rate !== null ? rate.toFixed(4) : null
  const dateStr = date ?? "today"

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How much is 1 ${base} in ${target}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            rateStr !== null
              ? `Based on the European Central Bank reference rate published on ${dateStr}, 1 ${base} equals ${rateStr} ${target}. This is a mid-market reference rate; bank buy/sell spreads and fees are not included.`
              : `CurrencyVersus shows the latest ${base} to ${target} reference rate published by the European Central Bank, updated once per business day.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the ${base} to ${target} exchange rate today?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            rateStr !== null
              ? `The latest published ECB reference rate (${dateStr}) is ${rateStr} ${target} per 1 ${base}. The ECB publishes once per business day around 16:00 CET, so the rate does not change over weekends or holidays.`
              : `CurrencyVersus provides the latest published ${base} to ${target} reference rate from the European Central Bank, updated once per business day.`,
        },
      },
      {
        "@type": "Question",
        name: `Where does CurrencyVersus get its ${base}/${target} data?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `CurrencyVersus sources all exchange rate data from the Frankfurter API, which provides European Central Bank (ECB) reference rates. The ECB publishes these once per business day, around 16:00 CET; they are not live market quotes. Gold and silver prices come separately from gold-api.com and update more frequently.`,
        },
      },
      {
        "@type": "Question",
        name: `Can I view historical ${base} to ${target} exchange rates?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes. CurrencyVersus provides historical ${base}/${target} exchange rate data across 7 time periods: 1 month, 3 months, 6 months, 1 year, 3 years, 5 years, and 10 years.`,
        },
      },
    ],
  }
}
