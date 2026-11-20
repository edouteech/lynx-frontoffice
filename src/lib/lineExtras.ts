/**
 * Personnalisation d'une ligne de vente (suppléments, option, commentaire) : calculs identiques à la caisse
 * (lynx_pos_v2, feuille « extras »). Sans dépendance, vérifié par tests/lineExtras.test.ts.
 */

export interface ExtraSupplement {
  id: string
  name: string
  price: number
}

export interface ExtraOption {
  id: string
  name: string
}

/** Personnalisation choisie pour une ligne (suppléments avec quantité, option à choix unique, commentaire). */
export interface LineExtras {
  /** Quantité choisie par supplément (id du supplément -> quantité > 0). */
  supplements: Record<string, number>
  optionId: string | null
  comment: string
}

export const emptyExtras: LineExtras = { supplements: {}, optionId: null, comment: '' }

/**
 * Prix unitaire d'une ligne personnalisée, comme la caisse : prix de base + suppléments × quantité
 * (une option est un simple choix, sans prix côté API).
 */
export function extrasUnitPrice(basePrice: number, supplements: ExtraSupplement[], extras: LineExtras): number {
  return basePrice + supplements.reduce((sum, s) => sum + s.price * (extras.supplements[s.id] ?? 0), 0)
}

/** Libellé court affiché sur la ligne et envoyé comme description (comme la caisse : « Option · +Supplément ×2 »). */
export function extrasDescription(supplements: ExtraSupplement[], options: ExtraOption[], extras: LineExtras): string {
  const parts: string[] = []
  const option = options.find((o) => o.id === extras.optionId)
  if (option) parts.push(option.name)
  for (const s of supplements) {
    const qty = extras.supplements[s.id] ?? 0
    if (qty > 0) parts.push(`+${s.name}${qty > 1 ? ` ×${qty}` : ''}`)
  }
  return parts.join(' · ')
}
