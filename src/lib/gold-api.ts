// gold-api.com response parsing, shared by the client (api.ts) and the build
// (build-data.ts). Live response shape (verified 2026-10-18):
//   {"currency":"USD","price":4166.100098,"symbol":"XAU",
//    "updatedAt":"2026-10-17T11:59:11Z","updatedAtReadable":"a few seconds ago"}
// There is no `timestamp` field.

export interface ParsedMetalPrice {
  price: number // USD per troy oz
  priceTime: string | null // provider's updatedAt as ISO, null if absent/invalid
}

export function parseGoldApiPrice(json: unknown): ParsedMetalPrice | null {
  if (!json || typeof json !== "object") return null
  const { price, updatedAt } = json as { price?: unknown; updatedAt?: unknown }
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null
  let priceTime: string | null = null
  if (typeof updatedAt === "string") {
    const ms = Date.parse(updatedAt)
    if (Number.isFinite(ms)) priceTime = new Date(ms).toISOString()
  }
  return { price, priceTime }
}
