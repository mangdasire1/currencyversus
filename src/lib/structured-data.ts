export function getWebApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "CurrencyVersus",
    url: "https://currencyversus.com",
    applicationCategory: "FinanceApplication",
    description:
      "Compare exchange rates between 15 major world currencies including USD, EUR, GBP, TRY, and more. View real-time rates and historical trends spanning up to 10 years.",
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
              ? `As of ${dateStr}, 1 ${base} equals ${rateStr} ${target} based on European Central Bank reference rates.`
              : `The current ${base} to ${target} exchange rate is available on CurrencyVersus, updated daily from European Central Bank data.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the ${base} to ${target} exchange rate today?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            rateStr !== null
              ? `The ${base}/${target} exchange rate as of ${dateStr} is ${rateStr} ${target} per 1 ${base}. CurrencyVersus tracks this rate using European Central Bank reference data.`
              : `CurrencyVersus provides the latest ${base} to ${target} exchange rate, sourced from the European Central Bank.`,
        },
      },
      {
        "@type": "Question",
        name: `Where does CurrencyVersus get its ${base}/${target} data?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `CurrencyVersus sources all exchange rate data from the Frankfurter API, which provides European Central Bank (ECB) reference rates. The ECB publishes reference rates for major currencies each business day.`,
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
