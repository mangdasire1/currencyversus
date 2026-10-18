// Single source of truth for every conversion direction shown in the UI.
// Pure — no React, no fetch — so it can be unit-tested with `node --test`.
//
// Directions: currency→currency, currency→metal, metal→currency,
// metal→metal and the A→A identity. Every consumer (converter, Quick Stats,
// historical table, metal pages) reads rate/label/status from here instead of
// assembling its own numbers and strings.

import { METALS, OZ_TO_GRAM } from "./metals.ts"

export type MetalUnit = "oz" | "g"
export type Unit = "currency" | MetalUnit

export type ConversionStatus = "loading" | "ready" | "stale" | "partial" | "error"

// An FX quote that carries its own pair identity. Anything whose base/quote
// does not match what the conversion needs is ignored, never displayed.
export interface FxQuote {
  base: string
  quote: string
  rate: number // 1 base = rate quote
  date: string | null // ECB publication date (YYYY-MM-DD)
  fetchedAt?: string | null // when we retrieved it (ISO)
  stale?: boolean
}

export interface MetalQuote {
  metal: string // XAU | XAG
  usdPerOz: number
  priceTime: string | null // provider timestamp (ISO, incl. time)
  fetchedAt?: string | null
  stale?: boolean
}

export interface ConversionInput {
  base: string
  quote: string
  amount?: number | null
  // Unit used for metal sides. baseMetalUnit / quoteMetalUnit override it
  // per side (e.g. XAU oz → XAU g).
  metalUnit?: MetalUnit
  baseMetalUnit?: MetalUnit
  quoteMetalUnit?: MetalUnit
  fx?: FxQuote | null
  metals?: Partial<Record<string, MetalQuote | null>>
  fxLoading?: boolean
  metalLoading?: boolean
}

export interface ConversionResult {
  base: string
  quote: string
  baseUnit: Unit
  quoteUnit: Unit
  rate: number | null // 1 baseUnit = rate quoteUnit
  inverseRate: number | null
  amount: number | null // converted amount
  rateLabel: string // "1 EUR = 0.0003 oz Gold" — the only place this string is built
  inverseRateLabel: string
  sourceDate: string | null // data's own date (FX date or metal price time)
  fetchedAt: string | null // our retrieval time
  fxDate: string | null // FX leg date when an FX rate was used
  metalPriceTime: string | null // metal leg time when a metal price was used
  status: ConversionStatus
  missing: string[] // "fx" | "metal"
}

export function isMetalCode(code: string): boolean {
  return METALS.some((m) => m.code === code)
}

export function metalName(code: string): string {
  return METALS.find((m) => m.code === code)?.name ?? code
}

// Grams in one unit.
function gramsPerUnit(unit: MetalUnit): number {
  return unit === "oz" ? OZ_TO_GRAM : 1
}

// Price of one unit given a per-troy-ounce price.
function pricePerUnit(perOz: number, unit: MetalUnit): number {
  return unit === "g" ? perOz / OZ_TO_GRAM : perOz
}

export function convertMetalUnits(value: number, from: MetalUnit, to: MetalUnit): number {
  return (value * gramsPerUnit(from)) / gramsPerUnit(to)
}

export function unitLabel(code: string, unit: Unit): string {
  return unit === "currency" ? code : `${unit} ${metalName(code)}`
}

// Label number formatting: integers stay bare ("1 EUR = 1 EUR"), values ≥ 1
// get 2–4 decimals, values < 1 keep 4 significant digits so small metal
// quantities never collapse to 0.00.
export function formatLabelNumber(n: number): string {
  if (!Number.isFinite(n)) return "—"
  if (Number.isInteger(n)) return n.toLocaleString("en-US")
  if (Math.abs(n) >= 1) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  }
  return n.toLocaleString("en-US", { maximumSignificantDigits: 4 })
}

function buildLabel(base: string, baseUnit: Unit, quote: string, quoteUnit: Unit, rate: number | null): string {
  const left = `1 ${unitLabel(base, baseUnit)}`
  const right = unitLabel(quote, quoteUnit)
  return `${left} = ${rate !== null ? formatLabelNumber(rate) : "—"} ${right}`
}

// Returns the quote only if it is for exactly this pair.
export function fxForPair(fx: FxQuote | null | undefined, base: string, quote: string): FxQuote | null {
  if (!fx) return null
  if (fx.base !== base || fx.quote !== quote) return null
  if (!Number.isFinite(fx.rate) || fx.rate <= 0) return null
  return fx
}

function metalFor(metals: ConversionInput["metals"], code: string): MetalQuote | null {
  const m = metals?.[code]
  if (!m || m.metal !== code || !Number.isFinite(m.usdPerOz) || m.usdPerOz <= 0) return null
  return m
}

function earliest(...isos: (string | null | undefined)[]): string | null {
  const vals = isos.filter((v): v is string => typeof v === "string" && v.length > 0)
  if (vals.length === 0) return null
  return vals.sort()[0]
}

export function computeConversion(input: ConversionInput): ConversionResult {
  const { base, quote } = input
  const unit = input.metalUnit ?? "g"
  const baseIsMetal = isMetalCode(base)
  const quoteIsMetal = isMetalCode(quote)
  const baseUnit: Unit = baseIsMetal ? (input.baseMetalUnit ?? unit) : "currency"
  const quoteUnit: Unit = quoteIsMetal ? (input.quoteMetalUnit ?? unit) : "currency"
  const amountIn = input.amount ?? null

  let rate: number | null = null
  let fxDate: string | null = null
  let metalPriceTime: string | null = null
  const fetched: (string | null | undefined)[] = []
  const missing: string[] = []
  let anyStale = false
  let pendingMissing = false

  const needFx = (fxBase: string, fxQuote: string): FxQuote | null => {
    const fx = fxForPair(input.fx, fxBase, fxQuote)
    if (!fx) {
      missing.push("fx")
      if (input.fxLoading) pendingMissing = true
      return null
    }
    fxDate = fx.date
    fetched.push(fx.fetchedAt)
    if (fx.stale) anyStale = true
    return fx
  }
  const needMetal = (code: string): MetalQuote | null => {
    const m = metalFor(input.metals, code)
    if (!m) {
      if (!missing.includes("metal")) missing.push("metal")
      if (input.metalLoading) pendingMissing = true
      return null
    }
    metalPriceTime = earliest(metalPriceTime, m.priceTime)
    fetched.push(m.fetchedAt)
    if (m.stale) anyStale = true
    return m
  }

  if (base === quote) {
    // Identity: never depends on fetched data. Same metal in different units
    // is a pure unit conversion.
    rate = baseIsMetal
      ? convertMetalUnits(1, baseUnit as MetalUnit, quoteUnit as MetalUnit)
      : 1
  } else if (!baseIsMetal && !quoteIsMetal) {
    const fx = needFx(base, quote)
    if (fx) rate = fx.rate
  } else if (baseIsMetal && quoteIsMetal) {
    const a = needMetal(base)
    const b = needMetal(quote)
    if (a && b) {
      rate = pricePerUnit(a.usdPerOz, baseUnit as MetalUnit) / pricePerUnit(b.usdPerOz, quoteUnit as MetalUnit)
    }
  } else {
    const metalCode = baseIsMetal ? base : quote
    const currency = baseIsMetal ? quote : base
    const metalUnitSide = (baseIsMetal ? baseUnit : quoteUnit) as MetalUnit
    const m = needMetal(metalCode)
    let usdToCurrency: number | null = null
    if (currency === "USD") {
      usdToCurrency = 1
    } else {
      const fx = needFx("USD", currency)
      if (fx) usdToCurrency = fx.rate
    }
    if (m && usdToCurrency !== null) {
      const currencyPerMetalUnit = pricePerUnit(m.usdPerOz, metalUnitSide) * usdToCurrency
      rate = baseIsMetal ? currencyPerMetalUnit : 1 / currencyPerMetalUnit
    }
  }

  const inverseRate = rate !== null && rate !== 0 ? 1 / rate : null
  const amount = rate !== null && amountIn !== null && Number.isFinite(amountIn) ? amountIn * rate : null

  let status: ConversionStatus
  if (rate !== null) {
    status = anyStale ? "stale" : "ready"
  } else if (pendingMissing) {
    status = "loading"
  } else {
    const needed = base === quote ? 0 : neededSources(baseIsMetal, quoteIsMetal, base, quote)
    status = missing.length > 0 && missing.length < needed ? "partial" : "error"
  }

  return {
    base,
    quote,
    baseUnit,
    quoteUnit,
    rate,
    inverseRate,
    amount,
    rateLabel: buildLabel(base, baseUnit, quote, quoteUnit, rate),
    inverseRateLabel: buildLabel(quote, quoteUnit, base, baseUnit, inverseRate),
    sourceDate: metalPriceTime ?? fxDate,
    fetchedAt: earliest(...fetched),
    fxDate,
    metalPriceTime,
    status,
    missing,
  }
}

// Number of distinct data sources a direction depends on.
function neededSources(baseIsMetal: boolean, quoteIsMetal: boolean, base: string, quote: string): number {
  if (!baseIsMetal && !quoteIsMetal) return 1
  if (baseIsMetal && quoteIsMetal) return 1
  const currency = baseIsMetal ? quote : base
  return currency === "USD" ? 1 : 2
}
