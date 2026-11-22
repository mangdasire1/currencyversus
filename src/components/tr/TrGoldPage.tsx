"use client"

import { useConversionInputs } from "@/hooks/useConversion"
import { computeConversion } from "@/lib/conversion"
import { metalPriceSignificant } from "@/lib/metal-units"
import type { WeightUnit } from "@/lib/metal-units"
import { trUtcTime, trDateShort } from "@/lib/format-tr"
import type { ExchangeRate } from "@/lib/types"
import { MetalUnitConverter } from "@/components/MetalUnitConverter"
import { PV, MONO } from "@/components/pilot/palette"
import { TrStaleNote } from "./TrStaleNote"

interface TrGoldPageProps {
  target: "TRY" | "USD"
  initialOzPriceUsd: number | null
  initialPriceTime: string | null
  initialUsdToTargetRate: number | null // null for USD
  initialFxDate: string | null
  initialUnit: WeightUnit // gram on /tr/gram-altin/, troy ounce on /tr/ons-altin/
  resultNote?: React.ReactNode // shown right under the result
}

// Gold price on the Turkish pilot pages (task C3-3): the English metal page's
// conversion model (gold-api.com spot price per troy ounce in USD, × the ECB
// USD→TL rate for TL), with the build-time price in the static HTML. The
// converter shows the result; nothing above repeats it.
export function TrGoldPage({ target, initialOzPriceUsd, initialPriceTime, initialUsdToTargetRate, initialFxDate, initialUnit, resultNote }: TrGoldPageProps) {
  const initialFx: ExchangeRate | null =
    target !== "USD" && initialUsdToTargetRate !== null && initialFxDate !== null
      ? { base: "USD", date: initialFxDate, rates: { [target]: initialUsdToTargetRate } }
      : null
  const inputs = useConversionInputs("XAU", target, {
    initialFx,
    initialMetalUsd: { XAU: initialOzPriceUsd },
    initialMetalTime: { XAU: initialPriceTime },
  })
  const perOz = computeConversion({ ...inputs, metalUnit: "oz" })
  const significant = perOz.significant ?? metalPriceSignificant("XAU", initialOzPriceUsd ?? 0)

  return (
    <>
      <MetalUnitConverter
        metalName="Altın"
        quote={{ kind: "money", code: target }}
        pricePerTroyOunce={perOz.rate}
        significant={significant}
        status={perOz.status === "loading" ? "Fiyat yükleniyor…" : perOz.rate === null ? "Fiyat şu anda alınamıyor." : null}
        locale="tr"
        initialUnit={initialUnit}
        resultNote={
          <>
            {resultNote}
            {/* in the result's card, after the note that must come first */}
            {perOz.status === "stale" && <TrStaleNote />}
          </>
        }
      />
      <div className="flex flex-col gap-1 text-xs" style={{ ...MONO, color: PV.faint }}>
        <p>
          Fiyat zamanı (sağlayıcının bildirdiği): {trUtcTime(perOz.metalPriceTime) ?? "—"} · Kaynak: gold-api.com
        </p>
        {perOz.fxDate && <p>Dolardan TL&apos;ye çeviri: ECB referans kuru, {trDateShort(perOz.fxDate)}</p>}
      </div>
    </>
  )
}
