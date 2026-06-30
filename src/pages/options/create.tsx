import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import type { Option, Product } from '../../types/api'
import { createOption, updateOption } from '../../api/options'
import { fetchProducts } from '../../api/products'
import { getApiErrorMessage } from '../../lib/apiError'

export interface OptionCreateModalProps {
  open: boolean
  option: Option | null
  onClose: () => void
  onSaved: () => void
}

export function OptionCreateModal({
  open,
  option,
  onClose,
  onSaved,
}: OptionCreateModalProps) {
  const isEdit = option !== null
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [productIds, setProductIds] = useState<number[]>([])
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    setSubmitting(false)
  }, [open, option?.id])

  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const products = await fetchProducts(1)
        setAvailableProducts(products.data)
      } catch {
        // best-effort
      }
    })()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!option) {
      setName('')
      setStatus('active')
      setProductIds([])
      setProductSearch('')
      return
    }
    setName(option.name)
    setStatus(option.status)
    setProductIds((option.products ?? []).map((p) => p.id))
    setProductSearch('')
  }, [open, option])

  const selectedProductSet = useMemo(() => new Set(productIds), [productIds])
  const allProductIds = useMemo(
    () => availableProducts.map((p) => p.id),
    [availableProducts]
  )

  const filteredProducts = useMemo(() => {
    if (!productSearch) return availableProducts
    const search = productSearch.toLowerCase()
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search)
    )
  }, [availableProducts, productSearch])

  const allProductsSelected =
    allProductIds.length > 0 && productIds.length === allProductIds.length

  function toggleProduct(id: number) {
    setProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        status,
        product_ids: productIds,
      }
      if (isEdit && option) {
        await updateOption(option.id, payload)
      } else {
        await createOption(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={submitting}
      title={isEdit ? "Modifier l'option" : 'Nouvelle option'}
      subtitle={
        isEdit && option
          ? option.name
          : 'Définissez un nom et sélectionnez des produits.'
      }
    >
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Ex. Taille, Couleur, Garniture..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Statut
            </label>
            <select
              aria-label="Statut"
              title="Statut"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">
              Produits ({productIds.length})
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={allProductsSelected}
                disabled={availableProducts.length === 0}
                onChange={(e) => {
                  setProductIds(e.target.checked ? allProductIds : [])
                }}
                className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Tout sélectionner
            </label>
          </div>
          <div className="mb-2">
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
            />
          </div>
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="text-sm text-gray-500">
                {productSearch ? 'Aucun produit trouvé.' : 'Aucun produit chargé.'}
              </div>
            ) : (
              filteredProducts.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedProductSet.has(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!submitting) onClose()
            }}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  )
}
