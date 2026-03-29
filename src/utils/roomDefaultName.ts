import { RUIMTE_FUNCTIE_NAAM_PREFIX } from './ruimteFunctiePlanStyle'

/** Eerste vrije generieke naam als er geen functie gekozen is (Kamer 1, Kamer 2, …). */
export function nextGenericKamerName(
  order: string[],
  roomMap: Record<string, { name: string }>,
): string {
  const used = new Set(
    order.map(id => roomMap[id]?.name).filter((n): n is string => Boolean(n)),
  )
  let n = 1
  while (used.has(`Kamer ${n}`) || used.has(`Kamer${n}`)) n += 1
  return `Kamer ${n}`
}

type RoomDetailsSlice = Record<string, { ruimteFunctie?: string } | undefined>

/**
 * Voorgestelde kamernaam: bij functie o.a. "Slaapkamer 1"; zonder functie "Kamer 1".
 * Telt bestaande kamers met dezelfde functie (optioneel huidige kamer uitsluiten).
 */
export function suggestedRoomNameForFunctie(
  functie: string,
  roomOrder: string[],
  roomMap: Record<string, { name: string }>,
  roomDetails: RoomDetailsSlice,
  excludeRoomId?: string | null,
): string {
  const f = functie?.trim() ?? ''
  if (!f) {
    return nextGenericKamerName(roomOrder, roomMap)
  }
  const prefix = RUIMTE_FUNCTIE_NAAM_PREFIX[f]
  if (!prefix) {
    return nextGenericKamerName(roomOrder, roomMap)
  }
  let count = 0
  for (const id of roomOrder) {
    if (id === excludeRoomId) continue
    const rf = roomDetails[id]?.ruimteFunctie?.trim() ?? ''
    if (rf === f) count++
  }
  return `${prefix} ${count + 1}`
}
