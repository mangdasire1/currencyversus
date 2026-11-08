// Precious metals priced per troy ounce by gold-api.com (unit check:
// src/lib/metal-units.ts). Gold and silver have a page for every currency;
// platinum and palladium only for METAL_PAGE_CURRENCIES (src/lib/routes.ts).
export const METALS = [
  { code: "XAU", name: "Gold", shortName: "Gold", icon: "🥇", unit: "oz" },
  { code: "XAG", name: "Silver", shortName: "Silver", icon: "🥈", unit: "oz" },
  { code: "XPT", name: "Platinum", shortName: "Platinum", icon: "", unit: "oz" },
  { code: "XPD", name: "Palladium", shortName: "Palladium", icon: "", unit: "oz" },
] as const

export type MetalCode = (typeof METALS)[number]["code"]

export const OZ_TO_GRAM = 31.1034768
export const METAL_API_BASE = "https://api.gold-api.com"

export function isMetal(code: string): boolean {
  return METALS.some((m) => m.code === code)
}

export function metalPriceInCurrency(metalUsdPrice: number, usdToCurrencyRate: number): number {
  return metalUsdPrice * usdToCurrencyRate
}

export function perGram(ozPrice: number): number {
  return ozPrice / OZ_TO_GRAM
}
