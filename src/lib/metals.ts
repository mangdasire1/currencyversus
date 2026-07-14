export const METALS = [
  { code: "XAU", name: "Gold", shortName: "Gold", icon: "🥇", unit: "oz" },
  { code: "XAG", name: "Silver", shortName: "Silver", icon: "🥈", unit: "oz" },
] as const

export type MetalCode = (typeof METALS)[number]["code"]

export const OZ_TO_GRAM = 31.1034768
export const METAL_API_BASE = "https://api.gold-api.com"

export function isMetal(code: string): boolean {
  return code === "XAU" || code === "XAG"
}

export function metalPriceInCurrency(metalUsdPrice: number, usdToCurrencyRate: number): number {
  return metalUsdPrice * usdToCurrencyRate
}

export function perGram(ozPrice: number): number {
  return ozPrice / OZ_TO_GRAM
}
