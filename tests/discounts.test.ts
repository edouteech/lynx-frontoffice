// Remises du web = remises de la caisse. Chaque cas rejoue la même suite d'opérations que dans la caisse
// (remise de ligne, remise globale, remise globale puis remise de ligne) et compare TOUS les chiffres.
// Cas de référence : docs/ventes-web-cas-de-test-remises.dart (formules de lynx_pos_v2, exécutées).
// Lancer : npm run test:calc
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computeSale, freezeDiscounts } from '../src/lib/saleCalc.ts'
import type { CalcLineInput, GlobalDiscount, LineDiscount } from '../src/lib/saleCalc.ts'

type Op = ['line', number, 'percent' | 'amount', number] | ['global', 'percent' | 'amount', number]

interface Vector {
  input: { lines: number[][]; ops: Op[] }
  sur: {
    lines: { unit_price: number; unit_price_ht: number }[]
    total: number
    total_ht: number
    discount: number
  }
}

const file = JSON.parse(
  readFileSync(new URL('./fixtures/pos-discount-vectors.json', import.meta.url), 'utf8'),
) as { calc: Record<string, Vector> }

/** Rejoue les opérations comme le fera le formulaire (cf. règles de la caisse). */
function replay(vector: Vector) {
  const lines: CalcLineInput[] = vector.input.lines.map(([unitPrice, vatRate, quantity]) => ({ unitPrice, vatRate, quantity }))
  let global: GlobalDiscount | null = null

  for (const op of vector.input.ops) {
    if (op[0] === 'global') {
      global = { kind: op[1], value: op[2] }
      continue
    }
    // Remise sur UNE ligne : la remise globale est abandonnée, les autres lignes gardent ce qu'elle avait calculé.
    const [, index, kind, value] = op
    if (global) {
      const frozen = freezeDiscounts(lines, global)
      lines.forEach((l, i) => { l.discount = frozen[i] })
      global = null
    }
    lines[index].discount = { kind, value } as LineDiscount
  }

  return computeSale(lines, { benin: true, globalDiscount: global })
}

for (const [name, vector] of Object.entries(file.calc)) {
  test(`remises caisse = web : ${name}`, () => {
    const result = replay(vector)
    assert.equal(result.total, vector.sur.total)
    assert.equal(result.total_ht, vector.sur.total_ht)
    assert.equal(result.discount, vector.sur.discount)
    assert.deepEqual(
      result.lines,
      vector.sur.lines.map((l) => ({ unit_price: l.unit_price, unit_price_ht: l.unit_price_ht })),
    )
  })
}

test('remise globale : elle remplace les remises de ligne', () => {
  const lines: CalcLineInput[] = [
    { unitPrice: 1000, vatRate: 0, quantity: 1, discount: { kind: 'percent', value: 50 } },
    { unitPrice: 1000, vatRate: 0, quantity: 1 },
  ]
  const r = computeSale(lines, { benin: true, globalDiscount: { kind: 'amount', value: 200 } })
  assert.equal(r.discount, 200)
  assert.equal(r.total, 1800)
})

test('remise globale en montant : le bruit des nombres à virgule ne crée pas de +1 fantôme', () => {
  const lines: CalcLineInput[] = [
    { unitPrice: 3333, vatRate: 18, quantity: 1 },
    { unitPrice: 3333, vatRate: 18, quantity: 1 },
    { unitPrice: 3334, vatRate: 18, quantity: 1 },
  ]
  assert.equal(computeSale(lines, { benin: true, globalDiscount: { kind: 'amount', value: 500 } }).discount, 500)
})

test('panier vide ou à zéro : aucune remise, aucune erreur', () => {
  assert.equal(computeSale([], { benin: true, globalDiscount: { kind: 'amount', value: 500 } }).total, 0)
  const free: CalcLineInput[] = [{ unitPrice: 0, vatRate: 18, quantity: 1 }]
  assert.equal(computeSale(free, { benin: true, globalDiscount: { kind: 'amount', value: 500 } }).discount, 0)
})
