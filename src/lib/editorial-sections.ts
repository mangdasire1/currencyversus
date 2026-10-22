// Which optional editorial sections a page shows. Pure — tested with
// `node --test`. A record may have no fun fact or no local context for a
// currency (blocks without a user question were removed in Phase 6); the
// page must then render no card and no heading at all — never an empty one.

export interface FunFactCard {
  code: string
  text: string
}

export function funFactCards(infos: Array<{ code: string; funFact?: string } | undefined>): FunFactCard[] {
  const cards: FunFactCard[] = []
  for (const info of infos) {
    const text = info?.funFact?.trim()
    if (info && text) cards.push({ code: info.code, text })
  }
  return cards
}

export function localContextText(
  info: { localContext: Record<string, string | undefined> } | undefined,
  currency: string
): string | null {
  const text = info?.localContext[currency]?.trim()
  return text ? text : null
}
