// Pilot layout palette (Phase 7 prototype). Direction colours are amber/teal,
// never green/red: a rising rate is good for some readers and bad for others,
// so colour must not pass judgement. src/lib/pilot-ui.test.ts enforces this.
export const PV = {
  bg: "#0C0D10",
  surface: "#14161B",
  raised: "#1B1E25",
  border: "#262A33",
  text: "#EDEEF2",
  dim: "#9AA1AE",
  faint: "#868E9C",
  accentText: "#8B8DF7",
  accentFill: "#6366F1",
  up: "#D99A4E",
  down: "#52B6C4",
} as const

export const MONO: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
  fontVariantNumeric: "tabular-nums",
}
export const SANS: React.CSSProperties = { fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }
