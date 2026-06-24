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
      <div className="flex min-h-screen items-center justify-center bg-[#FBF7EE] p-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-lg font-semibold text-[#1F3D2E]">Accès impossible</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6B7D6E]">{error}</p>
        </div>
      </div>
    )
  }

  // --- First paint loading screen ---
  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF7EE]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#1F3D2E] border-t-transparent" />
          <p className="text-sm font-medium text-[#6B7D6E]">Chargement de la boutique…</p>
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

  const filteredArticles = data.articles.filter((article) => {
    const matchesCategory = activeCategory === null || article.item_category_id === activeCategory
    const matchesSearch = search.trim() === '' || article.name.toLowerCase().includes(search.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#FBF7EE]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header — vert épinard plein, pas de gradient générique */}
      <header className="sticky top-0 z-30 bg-[#101842]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Section gauche : logo + nom boutique */}
            <div className="flex min-w-0 items-center gap-3.5">
              {data.organization.logo ? (
                <img
                  src={resolveBackendUrl(data.organization.logo) ?? ''}
                  className="h-[50px] w-[50px] shrink-0 rounded-xl bg-white/10 object-contain p-1.5"
                />
              ) : (
                <div
                  className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-[#D9A640] text-[22px] font-semibold text-[#1F3D2E]"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {data.organization.name.charAt(0)}
                </div>
              )}

              <div className="hidden h-8 w-px bg-white/15 sm:block" />

              <div className="min-w-0">
                <h1
                  className="truncate text-[22px] font-semibold leading-tight text-[#FBF7EE]"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {data.organization.name}
                </h1>
                <p className="truncate text-[12.5px] text-[#FBF7EE]/65">{data.store.name}</p>
              </div>
            </div>

            {/* Section droite : contact + panier */}
            <div className="flex shrink-0 items-center gap-5">
              {hasContactInfo && (
                <div className="hidden items-center gap-[18px] md:flex">
                  {data.store.address && (
                    <div className="flex items-center gap-1.5 text-[13px] text-[#FBF7EE]/75">
                      <MapPin className="h-3.5 w-3.5" />
                      {data.store.address}
                    </div>
                  )}
                  {data.store.phone && (
                    <div className="flex items-center gap-1.5 text-[13px] text-[#FBF7EE]/75">
                      <Phone className="h-3.5 w-3.5" />
                      {data.store.phone}
                    </div>
                  )}
                </div>
              )}

              <button
                aria-label="Panier"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] border border-white/15 bg-white/[0.06] text-[#FBF7EE] transition-colors duration-200 hover:bg-white/[0.12]"
              >
                <ShoppingBag className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Barre de recherche + catégories, sur un bandeau légèrement plus clair */}
        <div className="bg-[#16205B] border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 pt-3.5 sm:px-6 lg:px-8">
            <div className="relative flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FBF7EE]/45" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un article…"
                  className="w-full rounded-[10px] border border-white/15 bg-white/[0.07] py-2.5 pl-10 pr-4 text-[14px] text-[#FBF7EE] placeholder:text-[#FBF7EE]/45 focus:border-[#D9A640] focus:bg-white/10 focus:outline-none"
                />
              </div>
              <button
                aria-label="Filtres"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] border border-white/15 bg-white/[0.07] text-[#FBF7EE] transition-colors duration-200 hover:bg-white/[0.12]"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Catégories — "tickets" actifs en crème plein */}
            {hasCategories && (
              <div className="mt-3.5 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`flex shrink-0 items-center whitespace-nowrap rounded-t-[10px] px-5 py-2.5 text-[13px] font-medium transition-colors duration-200 ${
                    activeCategory === null
                      ? 'bg-[#FBF7EE] text-[#C8462E] font-semibold'
                      : 'text-[#FBF7EE]/70 hover:bg-white/5 hover:text-[#FBF7EE]'
                  }`}
                >
                  Tous
                </button>
                {data.categories.map((cat) => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-[10px] px-5 py-2.5 text-[13px] font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-[#FBF7EE] text-[#C8462E] font-semibold'
                          : 'text-[#FBF7EE]/70 hover:bg-white/5 hover:text-[#FBF7EE]'
                      }`}
                    >
                      {cat.color && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: isActive ? cat.color : '#fff' }}
                        />
                      )}
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {!loading && (
          <>
            <span className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#C8462E]">
              <span className="h-[1.5px] w-3.5 bg-[#C8462E]" />
              Catalogue
            </span>
            <div className="mb-4 text-[13.5px] text-[#6B7D6E]">
              <span className="font-bold text-[#1F3D2E]">{filteredArticles.length}</span>{' '}
              {filteredArticles.length === 1 ? 'article disponible' : 'articles disponibles'}
            </div>
          </>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[1, 2, 3, 4, 5, 6, 8, 9, 10].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-[#E6E0D2] bg-white">
                <div className="aspect-square w-full animate-pulse bg-[#F3ECDC]" />
                <div className="space-y-2 p-3">
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-[#F3ECDC]" />
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-[#F3ECDC]" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-[#F3ECDC]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center rounded-[20px] border border-dashed border-[#DCD4BE] bg-white/50 px-6 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F3ECDC] text-[#D9A640]">
              <PackageX className="h-6 w-6" />
            </div>
            <h3 className="text-[18px] font-semibold text-[#1F3D2E]" style={{ fontFamily: "'Fraunces', serif" }}>
              {search ? 'Aucun résultat' : 'Aucun article ici'}
            </h3>
            <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-[#6B7D6E]">
              {search
                ? `Aucun article ne correspond à « ${search} ». Essayez un autre mot-clé.`
                : "Cette catégorie ne contient pas encore d'article. Essayez « Tous » ou revenez plus tard."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredArticles.map((article) => {
              const inStock = article.stock_quantity > 0
              return (
                <div
                  key={article.id}
                  className="group flex flex-col overflow-visible rounded-2xl border border-[#E6E0D2] bg-white transition-all duration-200 hover:-translate-y-[3px] hover:border-[#D8D0BC] hover:shadow-[0_10px_24px_-8px_rgba(31,61,46,0.18)]"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-[#F3ECDC]">
                    {article.image_url ? (
                      <img
                        src={resolveBackendUrl(article.image_url) ?? ''}
                        alt={article.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[#C8BFA8]">
                        <ShoppingBag className="h-7 w-7" />
                        <span className="text-[10.5px] font-medium">Pas d'image</span>
                      </div>
                    )}

                    {/* Pastille stock — forme organique, pas un simple rectangle */}
                    <span
                      className="absolute left-2.5 top-2.5 px-2.5 py-[5px] text-[10px] font-bold leading-none"
                      style={{
                        borderRadius: '40% 60% 55% 45% / 60% 50% 60% 40%',
                        backgroundColor: inStock ? '#E7F0E4' : '#FBEAE7',
                        color: inStock ? '#2B5240' : '#B3463A',
                      }}
                    >
                      {inStock ? 'En stock' : 'Rupture'}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-1 p-3">
                    {article.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#6B7D6E]">
                        {article.category.name}
                      </span>
                    )}
                    <h3 className="line-clamp-2 min-h-[2.6em] text-[13.5px] font-medium leading-snug text-[#1F3D2E]">
                      {article.name}
                    </h3>

                    {/* Étiquette prix façon "tampon" — élément signature */}
                    <span
                      className="mt-1.5 inline-block self-start px-3 py-[5px] text-[14px] font-medium leading-none text-[#FBF7EE]"
                      style={{
                        backgroundColor: '#E8553A',
                        fontFamily: "'DM Mono', monospace",
                        transform: 'rotate(-1.5deg)',
                        clipPath:
                          'polygon(0% 15%, 4% 0%, 96% 0%, 100% 15%, 100% 85%, 96% 100%, 4% 100%, 0% 85%)',
                      }}
                    >
                      {formatPrice(article.selling_price)}
                    </span>
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