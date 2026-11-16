import { formatSignificant, metalPriceSignificant } from "./metal-units.ts"

// Home page Precious Metals cards. Each card shows its metal at the precision
// its source publishes (METAL_PRICE_DECIMALS in metal-units.ts, with the
// measurement behind it):
//
// - per troy ounce: exactly the symbol's decimals — $3,875.3 · $47.465 ·
//   $1,477.4 · $983.5. No digit is added (gold has no cent digit) and none is
//   dropped (the earlier 4-significant-digit rule showed gold as "$4,072",
//   one published digit short);
// - per gram: the same significant digits as the ounce price it is derived
//   from, never more — $124.59 · $1.5260 · $47.500 · $31.62.
//
// The metal pages use the same rule, so a card and the page it links to show
// the same number.
export function formatCardUsd(value: number, code: string, usdPerTroyOunce: number): string {
  return "$" + formatSignificant(value, metalPriceSignificant(code, usdPerTroyOunce))
}
