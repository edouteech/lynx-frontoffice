/**
 * Calcul d'une vente, IDENTIQUE à celui de la caisse (application lynx_pos_v2) : une seule logique
 * pour la caisse et le web. Le client calcule et arrondit, l'API enregistre et additionne.
 *
 * Règles reproduites (cf. docs/projet-ventes-web.md, docs/ventes-web-cas-de-test-caisse.* et
 * docs/ventes-web-cas-de-test-remises.*) :
 *  - le prix saisi est un prix TTC ; HT unitaire = prix / (1 + TVA/100) ;
 *  - la remise s'applique ligne par ligne sur le HT : remise HT -> remise TTC = remise HT × (1 + TVA/100),
 *    prix net = prix − remise TTC. Sans remise, le prix est gardé tel quel (aucun recalcul, donc aucune
 *    dérive d'arrondi) ;
 *  - Bénin uniquement : arrondi au franc SUPÉRIEUR du prix net TTC et HT de chaque ligne envoyée, du
 *    total, du total HT, de la remise et de l'AIB. Autres pays : aucun arrondi ;
 *  - AIB (Bénin) : arrondi de (total non arrondi × 1 % ou 5 %) ; total = arrondi du total + AIB ;
 *  - frais supplémentaires (propres au web) : ajoutés au total, sans TVA et hors remise.
 *
 * Ce module est volontairement sans dépendance : il est vérifié par tests/saleCalc.test.ts
 * (cas de référence calculés avec les vraies formules de la caisse).
 */

/**
 * Remise d'UNE ligne, comme la caisse :
 *  - percent : pourcentage du prix HT ;
 *  - amount  : montant TTC PAR UNITÉ ;
 *  - ht      : remise HT unitaire déjà calculée (sert à « figer » une remise globale, cf. freezeDiscounts).
 */
export type LineDiscount =
  | { kind: 'percent'; value: number }
  | { kind: 'amount'; value: number }
  | { kind: 'ht'; value: number }

/** Remise globale : pourcentage appliqué à chaque ligne, ou montant TTC TOTAL réparti au prorata des lignes. */
export type GlobalDiscount = { kind: 'percent'; value: number } | { kind: 'amount'; value: number }

export interface CalcLineInput {
  /** Prix unitaire TTC avant remise. */
  unitPrice: number
  /** Taux de TVA en pourcentage (18 pour 18 %), 0 si le produit n'a pas de TVA. */
  vatRate: number
  quantity: number
  /** Remise propre à la ligne (ignorée si une remise globale est active, comme dans la caisse). */
  discount?: LineDiscount | null
}

export interface CalcOptions {
  /** Organisation du Bénin : active les arrondis au franc supérieur. */
  benin: boolean
  /** Remise globale en pourcentage (raccourci de `globalDiscount: { kind: 'percent' }`). */
  discountPct?: number
  /** Remise globale (pourcentage ou montant). Elle remplace les remises de ligne, comme dans la caisse. */
  globalDiscount?: GlobalDiscount | null
  /** Taux d'AIB en pourcentage : 0 (aucun), 1 ou 5. */
  aibPercent?: 0 | 1 | 5
  /** Frais supplémentaires (sans TVA, hors remise). */
  extraFees?: number
}

export interface CalcLineResult {
  /** Prix unitaire TTC NET de remise, à envoyer (arrondi pour le Bénin). */
  unit_price: number
  /** Prix unitaire HT NET de remise, à envoyer (arrondi pour le Bénin). */
  unit_price_ht: number
}

export interface CalcResult {
  lines: CalcLineResult[]
  /** Total à encaisser, AIB compris. */
  total: number
  total_ht: number
  /** Remise totale TTC en montant. */
  discount: number
  aib_amount: number | null
  /** 0.01 ou 0.05, comme la caisse. */
  aib_rate: number | null
}

/**
 * Arrondi au franc supérieur, protégé du bruit des nombres à virgule : 500.00000000000006 ne devient
 * pas 501 (le « +1 fantôme » corrigé par `beninCeil` côté caisse).
 */
export function beninCeil(value: number): number {
  return Math.ceil(value - 1e-6)
}

// Évite d'exposer un zéro négatif (-0) dans les données envoyées.
const clean = (n: number): number => (n === 0 ? 0 : n)

/**
 * Remise HT UNITAIRE effective de chaque ligne (règles de la caisse) :
 *  - remise globale active : pourcentage -> HT × % ; montant -> part TTC de la ligne = (total brut de la
 *    ligne / total brut) × montant / quantité, puis ramenée en HT. Elle remplace toute remise de ligne ;
 *  - sinon remise de ligne : pourcentage -> HT × % ; montant TTC unitaire -> ramené en HT ; `ht` -> tel quel.
 */
export function effectiveDiscountsHt(lines: CalcLineInput[], globalDiscount?: GlobalDiscount | null): number[] {
  const unitHt = (l: CalcLineInput): number => l.unitPrice / (1 + l.vatRate / 100)

  if (globalDiscount && globalDiscount.value > 0) {
    const grossTotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
    if (globalDiscount.kind === 'percent') {
      return lines.map((l) => (unitHt(l) * globalDiscount.value) / 100)
    }
    if (grossTotal <= 0) return lines.map(() => 0)
    return lines.map((l) => {
      const shareTtc = (((l.unitPrice * l.quantity) / grossTotal) * globalDiscount.value) / l.quantity
      return shareTtc / (1 + l.vatRate / 100)
    })
  }

  return lines.map((l) => {
    const d = l.discount
    if (!d || d.value <= 0) return 0
    if (d.kind === 'percent') return (unitHt(l) * d.value) / 100
    if (d.kind === 'amount') return d.value / (1 + l.vatRate / 100)
    return d.value
  })
}

/**
 * « Fige » les remises actuelles en remises de ligne (type `ht`). Quand on applique une remise sur UNE
 * ligne alors qu'une remise globale est active, la caisse abandonne la remise globale mais les autres
 * lignes gardent leur dernière remise calculée : on en fait autant.
 */
export function freezeDiscounts(lines: CalcLineInput[], globalDiscount?: GlobalDiscount | null): LineDiscount[] {
  return effectiveDiscountsHt(lines, globalDiscount).map((value): LineDiscount => ({ kind: 'ht', value }))
}

export function computeSale(lines: CalcLineInput[], options: CalcOptions): CalcResult {
  const { benin } = options
  const globalDiscount: GlobalDiscount | null =
    options.globalDiscount ?? ((options.discountPct ?? 0) > 0 ? { kind: 'percent', value: options.discountPct ?? 0 } : null)
  const extraFees = options.extraFees ?? 0
  const aibPercent = benin ? (options.aibPercent ?? 0) : 0
  const round = (v: number): number => (benin ? beninCeil(v) : v)
  const discountsHt = effectiveDiscountsHt(lines, globalDiscount)

  let cartTotal = 0
  let cartTotalHt = 0
  let cartDiscountTtc = 0
  const resultLines: CalcLineResult[] = []

  lines.forEach((line, index) => {
    const factor = 1 + line.vatRate / 100
    const unitPriceHt = line.unitPrice / factor
    const discountHt = discountsHt[index]
    const discountTtc = discountHt * factor

    cartTotal += (line.unitPrice - discountTtc) * line.quantity
    cartTotalHt += (unitPriceHt - discountHt) * line.quantity
    cartDiscountTtc += discountTtc * line.quantity

    const netHt = discountHt === 0 ? unitPriceHt : unitPriceHt - discountHt
    const net = discountHt === 0 ? line.unitPrice : netHt * factor
    resultLines.push({ unit_price: clean(round(net)), unit_price_ht: clean(round(netHt)) })
  })

  // Les frais sont ajoutés avant l'arrondi et l'AIB : ils font partie de ce que le client paie.
  const payable = cartTotal + extraFees
  const aibRate = aibPercent === 1 ? 0.01 : aibPercent === 5 ? 0.05 : null
  const aibAmount = aibRate === null ? null : beninCeil(payable * aibRate)

  return {
    lines: resultLines,
    total: clean(round(payable) + (aibAmount ?? 0)),
    total_ht: clean(round(cartTotalHt + extraFees)),
    discount: clean(round(cartDiscountTtc)),
    aib_amount: aibAmount,
    aib_rate: aibRate,
  }
}
