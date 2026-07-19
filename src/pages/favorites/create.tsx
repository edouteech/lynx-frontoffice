import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import type { Favorite, Product, Store } from '../../types/api'
import { createFavorite, updateFavorite } from '../../api/favorites'
import { fetchProducts, type FetchProductsParams } from '../../api/products'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'

async function fetchAllProducts(params: FetchProductsParams = {}): Promise<Product[]> {
  let all: Product[] = []
  let page = 1
  let lastPage = 1
  do {
    const res = await fetchProducts({ ...params, page, per_page: 100 })
    all = all.concat(res.data)
    lastPage = res.last_page
    page = res.current_page + 1
  } while (page <= lastPage)
  return all
}

export interface FavoriteCreateModalProps {
  open: boolean
  favorite: Favorite | null
  onClose: () => void
  onSaved: () => void
}

export function FavoriteCreateModal({
  open,
  favorite,
  onClose,
  onSaved,
}: FavoriteCreateModalProps) {
  const isEdit = favorite !== null
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [availableStores, setAvailableStores] = useState<Store[]>([])
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [storeIds, setStoreIds] = useState<number[]>([])
  const [productIds, setProductIds] = useState<number[]>([])
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    setSubmitting(false)
  }, [open, favorite?.id])

  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const [stores, products] = await Promise.all([
          fetchStores(1),
          fetchAllProducts(),
        ])
        setAvailableStores(stores.data)
        setAvailableProducts(products)
      } catch {
        // best-effort, le formulaire reste utilisable avec ce qu'on a déjà.
      }
    })()
  }, [open])

  // Fetch products filtered by selected stores (favorites-specific logic)
  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        if (storeIds.length === 0) {
          // No stores selected, show all products
          setAvailableProducts(await fetchAllProducts())
        } else {
          // One or more stores selected, fetch products for each store and merge
          const productPromises = storeIds.map(storeId =>
            fetchAllProducts({ store_id: storeId })
          )
          const results = await Promise.all(productPromises)
          // Merge and deduplicate products by ID
          const allProducts = new Map<number, Product>()
          for (const result of results) {
            for (const product of result) {
              allProducts.set(product.id, product)
            }
          }
          setAvailableProducts(Array.from(allProducts.values()))
        }
      } catch {
        // best-effort, le formulaire reste utilisable avec ce qu'on a déjà.
      }
    })()
  }, [open, storeIds])

  useEffect(() => {
    if (!open) return
    if (!favorite) {
      setName('')
      setStatus('active')
      setStoreIds([])
      setProductIds([])
      setProductSearch('')
      return
    }
    setName(favorite.name)
    setStatus(favorite.status)
    setStoreIds((favorite.stores ?? []).map((s) => s.id))
    setProductIds((favorite.products ?? []).map((p) => p.id))
    setProductSearch('')
  }, [open, favorite])

  const selectedStoreSet = useMemo(() => new Set(storeIds), [storeIds])
  const selectedProductSet = useMemo(() => new Set(productIds), [productIds])
  const allStoreIds = useMemo(
    () => availableStores.map((s) => s.id),
    [availableStores]
  )
  const allProductIds = useMemo(
    () => availableProducts.map((p) => p.id),
    [availableProducts]
  )

  const filteredProducts = useMemo(() => {
    if (!productSearch) return availableProducts
    const search = productSearch.toLowerCase()
    return availableProducts.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.sku?.toLowerCase().includes(search)
    )
  }, [availableProducts, productSearch])

  const allStoresSelected =
    allStoreIds.length > 0 && storeIds.length === allStoreIds.length
  const allProductsSelected =
    allProductIds.length > 0 && productIds.length === allProductIds.length

  function toggleId(
    current: number[],
    id: number,
    set: (next: number[]) => void
  ) {
    if (current.includes(id)) {
      set(current.filter((x) => x !== id))
    } else {
      set([...current, id])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        status,
        store_ids: storeIds,
        product_ids: productIds,
      }
      if (isEdit && favorite) {
        await updateFavorite(favorite.id, payload)
      } else {
        await createFavorite(payload)
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
      title={isEdit ? 'Modifier le favori' : 'Nouveau favori'}
      subtitle={isEdit && favorite ? favorite.name : 'Sélectionnez des magasins et des produits.'}
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
              placeholder="Ex. Produits rapides"
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

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900">
                Magasins ({storeIds.length})
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={allStoresSelected}
                  disabled={availableStores.length === 0}
                  onChange={(e) => {
                    setStoreIds(e.target.checked ? allStoreIds : [])
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                />
                Tout sélectionner
              </label>
            </div>
            <div className="max-h-64 space-y-2 overflow-auto pr-1">
              {availableStores.length === 0 ? (
                <div className="text-sm text-gray-500">Aucun magasin chargé.</div>
              ) : (
                availableStores.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStoreSet.has(s.id)}
                      onChange={() => toggleId(storeIds, s.id, setStoreIds)}
                      className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    <span className="truncate">{s.name}</span>
                  </label>
                ))
              )}
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
                      onChange={() => toggleId(productIds, p.id, setProductIds)}
                      className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))
              )}
            </div>
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

