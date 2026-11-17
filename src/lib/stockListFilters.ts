/**
 * Filtres communs des listes de stock (Transferts de stock, Commandes centrale / fournisseur).
 * Une valeur absente = pas de filtre : la liste reste celle d'avant.
 */
export type StockListFilters = {
  /** Date de début (AAAA-MM-JJ). */
  dateFrom?: string
  /** Date de fin (AAAA-MM-JJ). */
  dateTo?: string
  /** Magasin (commandes) : un seul champ. */
  storeId?: number
  /** Transferts : magasin source et magasin destination, séparés. */
  fromStoreId?: number
  toStoreId?: number
  status?: string
  /** Centrale d'achat (commandes centrale uniquement). */
  centerId?: number
}

/** Paramètres de requête attendus par l'API, sans les valeurs vides. */
export function stockListParams(filters?: StockListFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (!filters) return params
  if (filters.dateFrom) params.date_from = filters.dateFrom
  if (filters.dateTo) params.date_to = filters.dateTo
  if (filters.storeId) params.store_id = filters.storeId
  if (filters.fromStoreId) params.from_store_id = filters.fromStoreId
  if (filters.toStoreId) params.to_store_id = filters.toStoreId
  if (filters.status) params.status = filters.status
  if (filters.centerId) params.purchasing_center_id = filters.centerId
  return params
}
