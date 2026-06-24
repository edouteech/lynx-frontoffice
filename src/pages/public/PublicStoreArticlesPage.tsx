import { useEffect, useRef, useState } from 'react'
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
  const searchSectionRef = useRef<HTMLDivElement>(null)

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
    <div 
      className="min-h-screen text-slate-800" 
      style={{ 
        fontFamily: "'Inter', sans-serif",
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 40%, #f8fafc 100%)'
      }}
    >
      {/* 1. Header & Cover Image */}
      <div className="relative">
        {/* Cover Background */}
        <div 
          className="h-48 md:h-64 w-full bg-cover bg-center bg-no-repeat relative overflow-hidden bg-slate-900"
          style={{
            backgroundImage: data.organization.store_cover_image 
              ? `url(${resolveBackendUrl(data.organization.store_cover_image)})` 
              : 'bg-[#ffffff]'
          }}
        >
           {/* Subtle pattern or overlay */}
           <div className="absolute inset-0 bg-black/20" />
           <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-slate-900/50 to-transparent" />
        </div>

        {/* Cart Button */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors shadow-lg ring-1 ring-white/30">
            <ShoppingBag className="h-5 w-5" />
          </button>
        </div>

        {/* Store Info Container */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
           <div className="flex flex-row items-center gap-4 -mt-12 sm:-mt-20 mb-8">
              {/* Floating Logo */}
              <div className="h-20 w-20 sm:h-32 sm:w-32 shrink-0 rounded-2xl sm:rounded-3xl bg-white p-1.5 shadow-2xl ring-4 ring-white/50 relative z-10 overflow-hidden">
                 {data.organization.logo ? (
                   <img
                     src={resolveBackendUrl(data.organization.logo) ?? ''}
                     alt="Logo"
                     className="h-full w-full rounded-xl sm:rounded-2xl object-contain bg-slate-50"
                   />
                 ) : (
                   <div className="flex h-full w-full items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#D9A640] to-amber-600 text-2xl sm:text-[40px] font-bold text-white shadow-inner">
                     {data.organization.name.charAt(0)}
                   </div>
                 )}
              </div>

              {/* Title & Contact */}
              <div className="text-left flex-1 pt-2">
                 <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                   {data.organization.name}
                 </h1>
                 <p className="mt-2 text-slate-400 font-medium text-sm sm:text-lg flex items-center justify-start gap-2">
                   {data.store.name}
                 </p>
                 {hasContactInfo && (
                    <div className="mt-2 hidden sm:flex flex-wrap items-center justify-start gap-x-6 gap-y-2 text-sm text-slate-600 font-medium">
                      {data.store.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          {data.store.address}
                        </div>
                      )}
                      {data.store.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-green-500" />
                          {data.store.phone}
                        </div>
                      )}
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* 2. Statistics Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-6 rounded-2xl sm:rounded-3xl bg-white p-3 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
           <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-1 sm:gap-4 text-center sm:text-left">
              <div className="flex h-9 w-9 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 text-base sm:text-2xl">
                 📦
              </div>
              <div>
                 <p className="text-xs sm:text-lg font-extrabold text-slate-900">{data.articles.length} <span className="hidden sm:inline">Articles</span><span className="sm:hidden">Art.</span></p>
                 <p className="text-[10px] sm:text-sm text-slate-500 font-medium leading-tight">Disponibles</p>
              </div>
           </div>
           <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-1 sm:gap-4 text-center sm:text-left border-x border-slate-100 sm:border-x-0">
              <div className="flex h-9 w-9 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-purple-50 text-base sm:text-2xl">
                 🏷️
              </div>
              <div>
                 <p className="text-xs sm:text-lg font-extrabold text-slate-900">{data.categories.length} <span className="hidden sm:inline">Catégories</span><span className="sm:hidden">Cat.</span></p>
                 <p className="text-[10px] sm:text-sm text-slate-500 font-medium leading-tight">Disponibles</p>
              </div>
           </div>
           <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-1 sm:gap-4 text-center sm:text-left">
              <div className="flex h-9 w-9 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-green-50 text-base sm:text-2xl">
                 ⭐
              </div>
              <div>
                 <p className="text-xs sm:text-lg font-extrabold text-slate-900">Vérifiés</p>
                 <p className="text-[10px] sm:text-sm text-slate-500 font-medium leading-tight">Qualité</p>
              </div>
           </div>
        </div>
      </div>

      {/* 3. Hero message & Search Bar */}
      <div ref={searchSectionRef} className="mx-auto pt-6 max-w-4xl px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
          Découvrez nos meilleurs articles
        </h2>
        <div className="relative flex items-center w-full h-14 sm:h-16 bg-white rounded-full shadow-lg border border-slate-200 focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-300">
           <Search className="absolute left-4 sm:left-6 h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
           <input
             type="text"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             onFocus={() => {
               searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
             }}
             placeholder="Rechercher un article..."
             className="w-full h-full pl-12 sm:pl-16 pr-14 sm:pr-16 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none text-base sm:text-lg font-medium rounded-full"
           />
           <button className="absolute right-1.5 sm:right-2 p-2.5 sm:p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
              <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
           </button>
        </div>
      </div>

      {/* 4. Categories (Netflix Style) */}
      {hasCategories && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-10">
          <div className="flex gap-3 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-center">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-all duration-300 border ${
                activeCategory === null
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {activeCategory === null ? '◉' : '○'} Tous
            </button>
            {data.categories.map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-all duration-300 border ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color || '#94a3b8' }}
                   />
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. Catalogue */}
      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[1, 2, 3, 4, 5, 6, 8, 9, 10].map((i) => (
              <div key={i} className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100">
                <div className="aspect-square w-full animate-pulse bg-slate-100" />
                <div className="space-y-3 p-3 sm:p-5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white/50 px-6 py-24 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <PackageX className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {search ? 'Aucun résultat' : 'Aucun article ici'}
            </h3>
            <p className="mt-2 max-w-sm text-base text-slate-500">
              {search
                ? `Aucun article ne correspond à « ${search} ». Essayez un autre mot-clé.`
                : "Cette catégorie ne contient pas encore d'article. Essayez « Tous » ou revenez plus tard."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredArticles.map((article) => {
              const inStock = article.stock_quantity > 0
              return (
                <div
                  key={article.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-100"
                >
                  {/* Stock Badge */}
                  {inStock ? (
                    <div className="absolute top-4 left-4 z-10 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 shadow-sm">
                      En stock
                    </div>
                  ) : (
                    <div className="absolute top-4 left-4 z-10 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                      Épuisé
                    </div>
                  )}

                  {/* Image Container */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
                    {article.image_url ? (
                      <img
                        src={resolveBackendUrl(article.image_url) ?? ''}
                        alt={article.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-slate-300 transition-transform duration-500 group-hover:scale-110">
                        <ShoppingBag className="h-12 w-12 mb-3" />
                        <span className="text-sm font-medium">Sans image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                  </div>

                  {/* Product Info */}
                  <div className="flex flex-1 flex-col p-3 sm:p-5">
                    <div className="mb-1.5 sm:mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              article.category?.color || '#ffff',
                          }}
                        />

                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                          {article.category?.name || 'Général'}
                        </span>
                      </div>
                    </div>

                    <h3 className="line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] text-sm sm:text-[15px] font-semibold leading-snug text-slate-800">
                      {article.name}
                    </h3>

                    {/* Action Button */}
                    <button 
                      className={`w-full rounded-xl sm:rounded-2xl py-2 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-300 ${
                        inStock 
                          ? 'bg-slate-50 text-slate-700 group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-md'
                          : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                      }`}
                      disabled={!inStock}
                    >
                      {formatPrice(article.selling_price)}
                    </button>
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