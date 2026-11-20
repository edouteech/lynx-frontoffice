// Réductions enregistrées : créneaux de validité identiques à ceux de la caisse (Reduction.isActiveNow).
// Cas de référence : docs/ventes-web-cas-de-test-remises.dart (49 combinaisons créneau x date, exécutées).
// Lancer : npm run test:calc
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { activeReductions, findReductionByCode, isValidityActiveNow, reductionAppliesToProduct } from '../src/lib/reductions.ts'
import type { ReductionLike } from '../src/lib/reductions.ts'
import type { ValidityConfig } from '../src/types/api.ts'

const file = JSON.parse(
  readFileSync(new URL('./fixtures/pos-discount-vectors.json', import.meta.url), 'utf8'),
) as { validity: { name: string; slots: ValidityConfig | null; now: string; active: boolean }[] }

for (const c of file.validity) {
  test(`validité caisse = web : ${c.name} le ${c.now}`, () => {
    assert.equal(isValidityActiveNow(c.slots, new Date(c.now)), c.active)
  })
}

const make = (over: Partial<ReductionLike>): ReductionLike => ({
  id: 1, name: 'PROMO10', type: 'percentage', value: 10, scope: 'global', is_active: true, validity_slots: null, ...over,
})

test('code promo : le nom, sans tenir compte de la casse ni des espaces', () => {
  const list = [make({ id: 1, name: 'Ramadan' }), make({ id: 2, name: 'PROMO10' })]
  assert.equal(findReductionByCode('  promo10 ', list)?.id, 2)
  assert.equal(findReductionByCode('inconnu', list), null)
  assert.equal(findReductionByCode('   ', list), null)
})

test('réduction spécifique : seulement ses produits ; globale : tous', () => {
  const specific = make({ scope: 'specific', products: [{ id: 7 }] })
  assert.equal(reductionAppliesToProduct(specific, 7), true)
  assert.equal(reductionAppliesToProduct(specific, 8), false)
  assert.equal(reductionAppliesToProduct(specific, null), false)
  assert.equal(reductionAppliesToProduct(make({}), 8), true)
})

test('réductions proposées : actives, pourcentage ou montant, dans leur créneau', () => {
  const now = new Date('2026-11-10T10:00:00')
  const list = [
    make({ id: 1 }),
    make({ id: 2, is_active: false }),
    make({ id: 3, type: 'variant' }),
    make({ id: 4, validity_slots: { mode: 'recurrente', time_from: '14:00', time_to: '18:00' } as ValidityConfig }),
    make({ id: 5, type: 'amount', value: 500 }),
  ]
  assert.deepEqual(activeReductions(list, now).map((r) => r.id), [1, 5])
})
