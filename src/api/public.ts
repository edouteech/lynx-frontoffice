import { apiPublic } from './apiClient'

export interface PublicArticle {
  id: number
  name: string
  selling_price: number
  stock_quantity: number
  item_category_id: number | null
  image_url: string | null
  category?: {
    id: number
    name: string
    color?: string
  }
}

export interface PublicCategory {
  id: number
  name: string
  color?: string
}

export interface PublicStoreInfo {
  organization: {
    name: string
    logo: string | null
    currency: string | null
  }
  store: {
    name: string
    address: string | null
    phone: string | null
  }
  categories: PublicCategory[]
  articles: PublicArticle[]
}

export async function fetchPublicStoreArticles(organizationSlug: string, storeSlug: string, categoryId?: number): Promise<PublicStoreInfo> {
  const params: Record<string, string | number> = {}
  if (categoryId) {
    params.category_id = categoryId
  }
  const { data } = await apiPublic.get<PublicStoreInfo>(`/public/store/${organizationSlug}/${storeSlug}/articles`, { params })
  return data
}
