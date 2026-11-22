import { formatAge } from "@/lib/format"
import { PV } from "./pilot/palette"

// "Showing saved data (2 h old)": a check for newer data failed and saved
// values are on screen. The pair pages' badge and the home page's metal cards.
// No age when what is shown is the build's data (src/lib/newer.ts).
export function SavedDataNote({ ageMs }: { ageMs: number | null }) {
  return <span style={{ color: PV.up }}>Showing saved data{ageMs !== null ? ` (${formatAge(ageMs)})` : ""}</span>
}
