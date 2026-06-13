import { useEffect, useState } from 'react'
import { Download, Upload, X, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import { api } from '../api/apiClient'
import type { Store } from '../types/api'

interface ProductImportModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ProductImportModal({ onClose, onSuccess }: ProductImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [storeId, setStoreId] = useState<string>('')
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: number; errors: number; error_details: string[] } | null>(null)

  // Load stores on mount
  useEffect(() => {
    setLoading(true)
    api.get<{ data: Store[] }>('/stores', { params: { page: 1 } })
      .then(res => setStores(res.data.data))
      .catch(() => setError('Erreur lors du chargement des magasins'))
      .finally(() => setLoading(false))
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ]
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError('Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier')
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    if (storeId) {
      formData.append('store_id', storeId)
    }

    try {
      const { data } = await api.post<{ results: { success: number; errors: number; error_details: string[] } }>(
        '/items/import',
        formData
      )
      setResult(data.results)
      if (data.results.success > 0) {
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de l'import"
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      const response = await api.get('/items/import/template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'modele_import_articles.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Impossible de télécharger le modèle')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-base font-semibold text-gray-900">Importer des articles</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloading}
              title="Télécharger le modèle Excel"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Modèle Excel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fichier Excel / CSV</label>
            <div className="relative">
              <input
                type="file"
                id="excel-file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="excel-file"
                className={`flex items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                  file ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {file ? (
                  <>
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-700">Cliquez pour sélectionner</p>
                      <p className="text-xs text-gray-500">.xlsx, .xls, .csv</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Store selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Affecter à un magasin spécifique <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des magasins...
              </div>
            ) : (
              <select
                value={storeId}
                onChange={e => setStoreId(e.target.value)}
                disabled={uploading}
                className="w-full h-10 appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              >
                <option value="">Tous les magasins</option>
                {stores.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Expected format info */}
          <div className="rounded-lg bg-blue-50 p-4 text-xs text-blue-800">
            <p className="font-semibold mb-2">Format attendu (première ligne = en-têtes) :</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li><strong>nom</strong> : Nom du produit (requis)</li>
              <li><strong>catégorie</strong> : Catégorie</li>
              <li><strong>référence</strong> : Référence</li>
              <li><strong>code-barres</strong> : Code-barres</li>
              <li><strong>prix_achat</strong> : Prix d'achat TTC</li>
              <li><strong>prix_vente</strong> : Prix de vente TTC</li>
              <li><strong>tva_achat</strong> : Taux de TVA achat (ex: 18%)</li>
              <li><strong>tva_vente</strong> : Taux de TVA vente (ex: 18%)</li>
              <li><strong>stock</strong> : Quantité en stock</li>
              <li><strong>seuil_alerte</strong> : Seuil d'alerte de stock</li>
              <li>
                <strong>vendu_par</strong> : Unité de vente
                <span className="ml-1 text-blue-500">(unité / poids / surface — défaut : unité)</span>
              </li>
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Result message */}
          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-green-900">Import terminé</p>
              </div>
              <div className="text-sm text-green-800 space-y-1">
                <p>✓ {result.success} produit(s) importé(s) avec succès</p>
                {result.errors > 0 && (
                  <p>✗ {result.errors} erreur(s)</p>
                )}
                {result.error_details.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-green-700 hover:text-green-900">
                      Voir les détails
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-green-700 list-disc list-inside">
                      {result.error_details.slice(0, 10).map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                      {result.error_details.length > 10 && (
                        <li className="text-green-600">... et {result.error_details.length - 10} autres erreurs</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
