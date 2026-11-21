// Which characters the share-image font can draw (task C3-4). Pure parsing —
// tested in glyphs.test.ts.
//
// The share images (share-image.tsx) are drawn by next/og with its built-in
// font, Geist Regular, shipped inside the next package
// (next/dist/compiled/@vercel/og/Geist-Regular.ttf). For a character the font
// lacks, the renderer would try to download a font while the site builds.
// Instead, every character of a card is looked up in the font's cmap first,
// and a missing one stops the build with its name.

// Code points mapped by a TrueType/OpenType font (cmap subtables of format 4
// and 12, which cover every font used here).
export function cmapCodePoints(font: Uint8Array): Set<number> {
  const v = new DataView(font.buffer, font.byteOffset, font.byteLength)
  const tables = v.getUint16(4)
  let cmap = -1
  for (let i = 0; i < tables; i++) {
    const r = 12 + i * 16
    if (String.fromCharCode(font[r], font[r + 1], font[r + 2], font[r + 3]) === "cmap") cmap = v.getUint32(r + 8)
  }
  if (cmap < 0) throw new Error("font has no cmap table")
  const has = new Set<number>()
  const subtables = v.getUint16(cmap + 2)
  for (let i = 0; i < subtables; i++) {
    const off = cmap + v.getUint32(cmap + 4 + i * 8 + 4)
    const format = v.getUint16(off)
    if (format === 4) {
      const segX2 = v.getUint16(off + 6)
      const ends = off + 14
      const starts = ends + segX2 + 2
      for (let s = 0; s < segX2 / 2; s++) {
        const end = v.getUint16(ends + 2 * s)
        for (let c = v.getUint16(starts + 2 * s); c <= end && c !== 0xffff; c++) has.add(c)
      }
    } else if (format === 12) {
      const groups = v.getUint32(off + 12)
      for (let g = 0; g < groups; g++) {
        const p = off + 16 + g * 12
        for (let c = v.getUint32(p), end = v.getUint32(p + 4); c <= end; c++) has.add(c)
      }
    }
  }
  return has
}

// Distinct characters of `text` the font cannot draw (spaces and line breaks
// need no glyph).
export function missingGlyphs(text: string, has: Set<number>): string[] {
  return [...new Set([...text])].filter((c) => !/\s/.test(c) && !has.has(c.codePointAt(0)!))
}
