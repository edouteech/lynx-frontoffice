// Personnalisation d'une ligne : prix = base + suppléments x quantité ; libellé « Option · +Supplément ×2 »
// (mêmes règles que la feuille « extras » de la caisse, lynx_pos_v2/lib/features/hub/widgets/hub_sheets.dart).
import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyExtras, extrasDescription, extrasUnitPrice } from '../src/lib/lineExtras.ts'

const supplements = [
  { id: 's1', name: 'Fromage', price: 500 },
  { id: 's2', name: 'Oeuf', price: 300 },
  { id: 's3', name: 'Sauce', price: 0 },
]
const options = [
  { id: 'o1', name: 'Bien cuit' },
  { id: 'o2', name: 'Saignant' },
]

test('sans personnalisation : le prix de base, aucun libellé', () => {
  assert.equal(extrasUnitPrice(2500, supplements, emptyExtras), 2500)
  assert.equal(extrasDescription(supplements, options, emptyExtras), '')
})

test('suppléments : prix de base + prix x quantité', () => {
  const extras = { ...emptyExtras, supplements: { s1: 2, s2: 1, s3: 1 } }
  assert.equal(extrasUnitPrice(2500, supplements, extras), 2500 + 1000 + 300)
})

test("l'option ne change pas le prix (aucun prix d'option côté API)", () => {
  assert.equal(extrasUnitPrice(2500, supplements, { ...emptyExtras, optionId: 'o1' }), 2500)
})

test('libellé : option puis suppléments, quantité affichée au-delà de 1', () => {
  const extras = { supplements: { s1: 2, s2: 1 }, optionId: 'o2', comment: '' }
  assert.equal(extrasDescription(supplements, options, extras), 'Saignant · +Fromage ×2 · +Oeuf')
})

test('supplément à quantité 0 ou inconnu : ignoré', () => {
  const extras = { supplements: { s1: 0, inconnu: 3 }, optionId: 'nope', comment: '' }
  assert.equal(extrasDescription(supplements, options, extras), '')
  assert.equal(extrasUnitPrice(1000, supplements, extras), 1000)
})
