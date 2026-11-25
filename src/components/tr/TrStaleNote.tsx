import { PV } from "@/components/pilot/palette"
import { TR_SAVED_DATA } from "@/lib/pilot-format-tr"

// Shown on every Turkish page with data when a check for newer data failed and
// saved values are on screen (conversion status "stale"). English pages say
// "Showing saved data" / "Showing cached data" in the same state.
export function TrStaleNote() {
  return (
    <p role="status" className="text-sm" style={{ color: PV.up }}>
      {TR_SAVED_DATA}
    </p>
  )
}
