import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicStoreArticles, type PublicStoreInfo } from '../../api/public'
import { resolveBackendUrl } from '../../lib/url'
import { MapPin, Phone, ShoppingBag, PackageX, AlertCircle, Search, SlidersHorizontal } from 'lucide-react'

export default function PublicStoreArticlesPage() {
  const { organizationSlug, storeSlug } = useParams<{ organizationSlug: string; storeSlug: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PublicStoreInfo | null>(null)
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!organizationSlug || !storeSlug) return
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchPublicStoreArticles(organizationSlug!, storeSlug!)
        if (!cancelled) {
          setData(res)
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err.response?.status === 403) {
            setError(' ')
          } else if (err.response?.status === 404) {
            setError('Boutique introuvable.')
          } else {
            setError('Une erreur est survenue lors du chargement des articles.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [organizationSlug, storeSlug])

  // --- Error screen ---
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-[#111827]">Accès impossible</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">{error}</p>
        </div>
      </div>
    )
  }

  // --- First paint loading screen ---
  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#111827] border-t-transparent" />
          <p className="text-sm font-medium text-[#9CA3AF]">Chargement de la boutique…</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: data.organization.currency || 'XOF',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const hasContactInfo = Boolean(data.store.address || data.store.phone)
  const hasCategories = data.categories.length > 0

  // Fond pastel pour les vignettes produit, dérivé de la couleur de catégorie.
  // Sans couleur définie, on retombe sur un gris neutre.
  const tintBackground = (hex?: string | null) => {
    if (!hex) return '#F3F4F6'
    return `${hex}26` // ~15% opacité sur fond clair
  }

  const filteredArticles = data.articles.filter((article) => {
    const matchesCategory = activeCategory === null || article.item_category_id === activeCategory
    const matchesSearch = search.trim() === '' || article.name.toLowerCase().includes(search.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Top bar — bold color block instead of white */}
      <header className="sticky top-0 z-30 bg-[#3B5BDB]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {data.organization.logo ? (
              <img
                src={resolveBackendUrl(data.organization.logo) ?? ''}
                className="h-10 w-10 shrink-0 rounded-lg bg-white/15 object-contain p-1"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-[15px] font-semibold text-white">
                {data.organization.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-tight text-white">
                {data.organization.name}
              </h1>
              <p className="truncate text-[12.5px] text-white/70">{data.store.name}</p>
            </div>
          </div>

          {hasContactInfo && (
            <div className="hidden shrink-0 items-center gap-5 md:flex">
              {data.store.address && (
                <div className="flex items-center gap-1.5 text-[13px] text-white/80">
                  <MapPin className="h-3.5 w-3.5" />
                  {data.store.address}
                </div>
              )}
              {data.store.phone && (
                <div className="flex items-center gap-1.5 text-[13px] text-white/80">
                  <Phone className="h-3.5 w-3.5" />
                  {data.store.phone}
                </div>
              )}
            </div>
          )}

          <button
            aria-label="Panier"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <ShoppingBag className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Search bar — sits on the color block, white pill for contrast */}
        <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un article…"
                className="w-full rounded-full border-none bg-white py-2.5 pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
            <button
              aria-label="Filtres"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Category pills — filled pastel colors per category */}
      {hasCategories && (
        <div className="sticky top-[96px] z-20 bg-[#F7F8FA] md:top-[100px]">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex shrink-0 items-center whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                activeCategory === null ? 'bg-[#111827] text-white' : 'bg-white text-[#6B7280] hover:bg-[#EEF0F3]'
              }`}
            >
              Tous
            </button>
            {data.categories.map((cat) => {
              const isActive = activeCategory === cat.id
              const color = cat.color || '#9CA3AF'
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition"
                  style={
                    isActive
                      ? { backgroundColor: color, color: '#fff' }
                      : { backgroundColor: `${color}26`, color }
                  }
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {!loading && (
          <div className="mb-4 text-[13.5px] text-[#6B7280]">
            <span className="font-semibold text-[#111827]">{filteredArticles.length}</span>{' '}
            {filteredArticles.length === 1 ? 'article disponible' : 'articles disponibles'}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[1, 2, 3, 4, 5, 6, 8, 9, 10].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                <div className="aspect-square w-full animate-pulse bg-[#F3F4F6]" />
                <div className="space-y-2 p-3">
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-[#F3F4F6]" />
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-[#F3F4F6]" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-[#F3F4F6]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-20 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
              <PackageX className="h-5 w-5" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#111827]">
              {search ? 'Aucun résultat' : 'Aucun article ici'}
            </h3>
            <p className="mt-1.5 max-w-sm text-[13.5px] text-[#6B7280]">
              {search
                ? `Aucun article ne correspond à « ${search} ». Essayez un autre mot-clé.`
                : "Cette catégorie ne contient pas encore d'article. Essayez « Tous » ou revenez plus tard."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredArticles.map((article) => {
              const inStock = article.stock_quantity > 0
              return (
                <div
                  key={article.id}
                  className="group flex flex-col overflow-hidden rounded-xl bg-white transition duration-150 hover:shadow-md"
                >
                  <div
                    className="relative aspect-square w-full overflow-hidden"
                    style={{ backgroundColor: tintBackground(article.category?.color) }}
                  >
                    {article.image_url ? (
                      <img
                        src={resolveBackendUrl(article.image_url) ?? ''}
                        alt={article.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#9CA3AF]">
                        <ShoppingBag className="h-7 w-7" />
                        <span className="text-[10.5px] font-medium">Pas d'image</span>
                      </div>
                    )}

                    <span
                      className={`absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                        inStock ? 'bg-[#C0DD97] text-[#173404]' : 'bg-[#F7C1C1] text-[#501313]'
                      }`}
                    >
                      {inStock ? 'En stock' : 'Rupture'}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-1 p-3">
                    {article.category && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: article.category.color || '#9CA3AF' }}
                      >
                        {article.category.name}
                      </span>
                    )}
                    <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-[#111827]">
                      {article.name}
                    </h3>
                    <p className="mt-1 text-[14.5px] font-semibold text-[#111827]">
                      {formatPrice(article.selling_price)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
