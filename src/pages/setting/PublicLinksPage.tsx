import { useEffect, useState } from 'react'
import { Link, ExternalLink, Download } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { fetchStores } from '../../api/stores'
import { fetchGeneralSetting, updateGeneralSettingWithCover } from '../../api/generalSettings'
import { useAuth } from '../../contexts/useAuth'
import { resolveBackendUrl } from '../../lib/url'
import type { Store } from '../../types/api'
import type { GeneralSetting } from '../../types/generalSetting'
import Swal from 'sweetalert2'

export default function PublicLinksPage() {
  const { currentOrganization } = useAuth()

  const [stores, setStores] = useState<Store[]>([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [setting, setSetting] = useState<GeneralSetting | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [savingCover, setSavingCover] = useState(false)

  useEffect(() => {
    void fetchStores(1)
      .then((res) => setStores(res.data))
      .finally(() => setStoresLoading(false))

    void fetchGeneralSetting().then(setSetting)
  }, [])

  const handleSaveCover = async () => {
    if (!coverFile) return
    try {
      setSavingCover(true)
      const updated = await updateGeneralSettingWithCover(coverFile)
      setSetting(updated)
      setCoverFile(null)
      Swal.fire({
        title: 'Enregistré',
        text: 'La bannière a été mise à jour.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch {
      Swal.fire({ title: 'Erreur', text: 'Impossible de sauvegarder la bannière.', icon: 'error' })
    } finally {
      setSavingCover(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Liens publics des magasins</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gérez la bannière et les liens publics de vos boutiques en ligne.
        </p>
      </div>

      {/* Cover image section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Link className="h-5 w-5 text-[#3B82F6]" />
          <h2 className="text-lg font-semibold text-gray-900">Image de couverture (Bannière)</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {coverFile ? (
            <img
              src={URL.createObjectURL(coverFile)}
              alt="Bannière"
              className="h-24 w-40 rounded-xl border border-gray-200 object-cover shadow-sm"
            />
          ) : setting?.store_cover_image ? (
            <img
              src={resolveBackendUrl(setting.store_cover_image) ?? ''}
              alt="Bannière"
              className="h-24 w-40 rounded-xl border border-gray-200 object-cover shadow-sm"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
              Aucune bannière
            </div>
          )}

          <div className="flex-1 w-full">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
            />
            <p className="mt-2 text-xs text-gray-400">Taille recommandée : 1200×400 px. Formats : JPG, PNG, WEBP.</p>
          </div>

          {coverFile && (
            <button
              type="button"
              disabled={savingCover}
              onClick={() => void handleSaveCover()}
              className="shrink-0 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:opacity-50"
            >
              {savingCover ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          )}
        </div>
      </div>

      {/* Stores links */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-[#3B82F6]" />
          <h2 className="text-lg font-semibold text-gray-900">Liens des boutiques</h2>
        </div>
        <p className="mb-6 text-sm text-gray-500">
          Copiez ou cliquez sur les liens ci-dessous pour accéder à la page des articles en ligne de chaque magasin.
        </p>

        {storesLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Chargement des magasins...</div>
        ) : stores.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">Aucun magasin disponible.</div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => {
              const url = `${window.location.origin}/${currentOrganization?.slug || ''}/${store.slug || ''}`
              return (
                <div
                  key={store.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{store.name}</div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-sm text-[#3B82F6] hover:underline break-all"
                    >
                      {url}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>

                  {/* Hidden high-res QR canvas */}
                  <div className="hidden">
                    <QRCodeCanvas
                      id={`qr-code-${store.id}`}
                      value={url}
                      size={1024}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(url)
                        Swal.fire({
                          title: 'Copié !',
                          text: 'Le lien a été copié dans le presse-papier.',
                          icon: 'success',
                          toast: true,
                          position: 'top-end',
                          timer: 1500,
                          showConfirmButton: false,
                        })
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                      Copier le lien
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const canvas = document.getElementById(`qr-code-${store.id}`) as HTMLCanvasElement
                        if (!canvas) return
                        const pngUrl = canvas.toDataURL('image/png')
                        const a = document.createElement('a')
                        a.href = pngUrl
                        a.download = `QR_${store.name.replace(/\s+/g, '_')}.png`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-[#3B82F6] bg-[#EFF6FF] px-3 py-1.5 text-sm font-medium text-[#3B82F6] transition hover:bg-[#DBEAFE]"
                    >
                      <Download className="h-4 w-4" />
                      QR Code
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
