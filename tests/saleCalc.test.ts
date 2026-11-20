// Vérifie que le calcul web (src/lib/saleCalc.ts) donne EXACTEMENT les mêmes chiffres que la caisse.
// Les cas de référence viennent de l'exécution des formules de lynx_pos_v2 (script Dart conservé dans
// docs/ventes-web-cas-de-test-caisse.dart). Lancer : npm run test:calc
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computeSale, beninCeil } from '../src/lib/saleCalc.ts'

interface Vector {
  input: { lines: number[][]; globalPct: number; aibPercent: number }
  sur: {
    lines: { unit_price: number; unit_price_ht: number; quantity: number }[]
    total: number
    total_ht: number
    discount: number
    aib_amount: number | null
    aib_rate: number | null
  }
}

const vectors = JSON.parse(
  readFileSync(new URL('./fixtures/pos-sale-vectors.json', import.meta.url), 'utf8'),
) as Record<string, Vector>

for (const [name, v] of Object.entries(vectors)) {
  test(`caisse = web : ${name}`, () => {
    const result = computeSale(
      v.input.lines.map(([unitPrice, vatRate, quantity]) => ({ unitPrice, vatRate, quantity })),
      { benin: true, discountPct: v.input.globalPct, aibPercent: v.input.aibPercent as 0 | 1 | 5 },
    )
    assert.equal(result.total, v.sur.total)
    assert.equal(result.total_ht, v.sur.total_ht)
    assert.equal(result.discount, Math.abs(v.sur.discount))
    assert.equal(result.aib_amount, v.sur.aib_amount)
    assert.equal(result.aib_rate, v.sur.aib_rate)
    assert.deepEqual(
      result.lines,
      v.sur.lines.map((l) => ({ unit_price: l.unit_price, unit_price_ht: l.unit_price_ht })),
    )
  })
}

test('arrondi sûr : le bruit des nombres à virgule ne crée pas de +1 fantôme', () => {
  assert.equal(beninCeil(500.00000000000006), 500)
  assert.equal(beninCeil(500.2), 501)
  assert.equal(beninCeil(500), 500)
})

test('hors Bénin : aucun arrondi', () => {
  const r = computeSale([{ unitPrice: 5000, vatRate: 18, quantity: 2 }], { benin: false, discountPct: 10 })
  assert.ok(Math.abs(r.total - 9000) < 1e-9)
  assert.ok(Math.abs(r.total_ht - 7627.118644067797) < 1e-6)
  assert.equal(r.aib_amount, null)
})

test('frais supplémentaires : ajoutés au total, sans TVA, hors remise', () => {
  const r = computeSale([{ unitPrice: 10000, vatRate: 0, quantity: 1 }], { benin: true, discountPct: 10, extraFees: 500 })
  assert.equal(r.total, 9500) // 9 000 + 500
  assert.equal(r.total_ht, 9500)
  assert.equal(r.discount, 1000)
})

test('AIB ignorée hors Bénin', () => {
  const r = computeSale([{ unitPrice: 11800, vatRate: 18, quantity: 1 }], { benin: false, aibPercent: 1 })
  assert.equal(r.aib_amount, null)
  assert.equal(r.total, 11800)
})
