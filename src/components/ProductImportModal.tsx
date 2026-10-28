import { useEffect, useRef, useState } from 'react'
import { Download, Upload, X, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from '../api/apiClient'
import type { Store } from '../types/api'

interface ProductImportModalProps {
  onClose: () => void
  onSuccess: () => void
}

const CHUNK_SIZE = 100 // 100 articles par lot (environ 0.3s à 0.6s par requête)

const NAME_COLUMN_ALIASES = ['name', 'nom', 'article', 'libellé', 'libelle', 'produit']

export default function ProductImportModal({ onClose, onSuccess }: ProductImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: (string | number)[][] } | null>(null)
  const [fileStats, setFileStats] = useState<{ totalRows: number; chunksCount: number } | null>(null)
  const [parsing, setParsing] = useState(false)
  const [storeId, setStoreId] = useState<string>('')
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{
    current: number
    total: number
    chunk: number
    totalChunks: number
    percent: number
  } | null>(null)
  const [result, setResult] = useState<{ success: number; errors: number; error_details: string[] } | null>(null)

  const abortRef = useRef(false)

  // Load stores on mount
  useEffect(() => {
    setLoading(true)
    api.get<{ data: Store[] }>('/stores', { params: { page: 1 } })
      .then(res => setStores(res.data.data))
      .catch(() => setError('Erreur lors du chargement des magasins'))
      .finally(() => setLoading(false))
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV')
      setFile(null)
      setParsedData(null)
      setFileStats(null)
      return
    }

    setFile(selectedFile)
    setError(null)
    setResult(null)
    setProgress(null)
    setParsing(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        throw new Error('Le fichier ne contient aucune feuille.')
      }

      const worksheet = workbook.Sheets[firstSheetName]
      const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' })

      if (!rawRows || rawRows.length < 2) {
        throw new Error('Le fichier est vide ou ne contient que la ligne des en-têtes.')
      }

      const headers = rawRows[0].map(h => String(h ?? '').trim())

      // Vérifie la présence de la colonne nom
      const hasNameCol = headers.some(h => NAME_COLUMN_ALIASES.includes(h.toLowerCase()))
      if (!hasNameCol) {
        throw new Error(
          "Colonne 'nom' (ou 'article', 'name') introuvable dans la première ligne du fichier. Veuillez vérifier vos en-têtes."
        )
      }

      // Filtre les lignes de données non vides
      const dataRows: (string | number)[][] = []
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i]
        const hasContent = Array.isArray(row) && row.some(cell => cell !== '' && cell !== null && cell !== undefined)
        if (hasContent) {
          // Normalise chaque cellule en string (ou nombre)
          const cleanRow = headers.map((_, colIdx) => {
            const val = row[colIdx]
            return val !== null && val !== undefined ? val : ''
          })
          dataRows.push(cleanRow)
        }
      }

      if (dataRows.length === 0) {
        throw new Error('Aucun article détecté dans le fichier.')
      }

      const chunksCount = Math.ceil(dataRows.length / CHUNK_SIZE)
      setParsedData({ headers, rows: dataRows })
      setFileStats({ totalRows: dataRows.length, chunksCount })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier'
      setError(msg)
      setFile(null)
      setParsedData(null)
      setFileStats(null)
    } finally {
      setParsing(false)
    }
  }

  const handleUpload = async () => {
    if (!parsedData || parsedData.rows.length === 0) {
      setError('Veuillez sélectionner un fichier valide.')
      return
    }

    setUploading(true)
    setError(null)
    setResult(null)
    abortRef.current = false

    const totalRows = parsedData.rows.length
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE)

    let totalSuccess = 0
    let totalErrors = 0
    const allDetails: string[] = []

    try {
      for (let i = 0; i < totalChunks; i++) {
        if (abortRef.current) {
          allDetails.push("Import interrompu par l'utilisateur.")
          break
        }

        const chunkRows = parsedData.rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        const startLine = i * CHUNK_SIZE + 2 // +2 car ligne 1 = en-tête

        const currentProcessed = Math.min((i + 1) * CHUNK_SIZE, totalRows)
        const percent = Math.round(((i + 1) / totalChunks) * 100)

        setProgress({
          current: currentProcessed,
          total: totalRows,
          chunk: i + 1,
          totalChunks,
          percent,
        })

        const { data } = await api.post<{
          results: { success: number; errors: number; error_details: string[] }
        }>('/items/import-chunk', {
          headers: parsedData.headers,
          rows: chunkRows,
          start_line_number: startLine,
          store_id: storeId ? Number(storeId) : null,
        })

        totalSuccess += data.results.success
        totalErrors += data.results.errors
        if (data.results.error_details && data.results.error_details.length > 0) {
          allDetails.push(...data.results.error_details)
        }
      }

      setResult({
        success: totalSuccess,
        errors: totalErrors,
        error_details: allDetails,
      })

      if (totalSuccess > 0) {
        onSuccess()
        if (totalErrors === 0 && !abortRef.current) {
          setTimeout(() => {
            onClose()
          }, 2500)
        }
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: string; message?: string } }; message?: string }
      const message =
        errObj?.response?.data?.error ??
        errObj?.response?.data?.message ??
        errObj?.message ??
        "Erreur lors de l'envoi du bloc"
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  const handleAbort = () => {
    abortRef.current = true
  }

  const handleDownloadErrors = () => {
    if (!result || result.error_details.length === 0) return
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + result.error_details.map(e => `"${e.replace(/"/g, '""')}"`).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'erreurs_import_articles.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
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
            <p className="text-xs text-gray-500">Ajout ou mise à jour d'articles en masse</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloading || uploading}
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
              disabled={uploading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
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
                className={`flex items-center gap-3.5 rounded-xl border-2 border-dashed p-4 cursor-pointer transition-colors ${
                  file
                    ? 'border-green-300 bg-green-50/70 justify-start'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 justify-center text-center'
                } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {parsing ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 w-full py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span>Analyse du fichier en cours...</span>
                  </div>
                ) : file ? (
                  <>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                        {fileStats && (
                          <span className="shrink-0 inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                            ✓ {fileStats.totalRows.toLocaleString()} articles détectés
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-blue-600 font-medium hover:underline">Changer de fichier</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-700">Cliquez pour sélectionner un fichier</p>
                      <p className="text-xs text-gray-500">.xlsx, .xls, .csv</p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Store selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
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

          {/* Progress bar during chunked upload */}
          {uploading && progress && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                <span>
                  Importation : {progress.current.toLocaleString()} / {progress.total.toLocaleString()} articles
                </span>
                <span>{progress.percent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-blue-700">
                Veuillez patienter pendant le traitement des articles...
              </p>
            </div>
          )}

          {/* Expected format info */}
          {!uploading && !result && (
            <div className="rounded-lg bg-blue-50/70 p-3.5 text-xs text-blue-800">
              <p className="font-semibold mb-1.5">Format attendu (première ligne = en-têtes) :</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li><strong>nom</strong> : Nom du produit (requis)</li>
                <li><strong>catégorie</strong> : Catégorie</li>
                <li><strong>référence</strong> : Référence (SKU)</li>
                <li><strong>code-barres</strong> : Code-barres</li>
                <li><strong>prix_achat</strong> : Prix d'achat TTC</li>
                <li><strong>prix_vente</strong> : Prix de vente TTC</li>
                <li><strong>tva_achat / tva_vente</strong> : Code TVA (ex: A, B)</li>
                <li><strong>stock</strong> : Quantité en stock</li>
                <li><strong>seuil_alerte</strong> : Seuil d'alerte</li>
                <li><strong>vendu_par</strong> : unité / poids / surface</li>
              </ul>
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
              <p>{error}</p>
            </div>
          )}

          {/* Final Result */}
          {result && (
            <div className={`rounded-xl border p-4 ${result.errors > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-gray-900">Import terminé</p>
                </div>
                {result.error_details.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadErrors}
                    className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 shadow-xs"
                  >
                    <FileDown className="h-3 w-3 text-amber-600" />
                    Télécharger les erreurs (.csv)
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-800 space-y-1">
                <p className="text-green-800 font-medium">✓ {result.success.toLocaleString()} article(s) importé(s) avec succès</p>
                {result.errors > 0 && (
                  <p className="text-amber-800 font-medium">⚠ {result.errors.toLocaleString()} erreur(s) détectée(s)</p>
                )}
                {result.error_details.length > 0 && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                      Voir le détail des erreurs ({result.error_details.length})
                    </summary>
                    <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 rounded border border-amber-200 bg-white p-2 text-amber-900 list-disc list-inside">
                      {result.error_details.slice(0, 50).map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                      {result.error_details.length > 50 && (
                        <li className="font-semibold text-amber-700">... et {result.error_details.length - 50} autres erreurs (voir fichier CSV téléchargé)</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          {uploading ? (
            <button
              type="button"
              onClick={handleAbort}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              Arrêter l'import
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          )}

          {!uploading && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!parsedData || parsing || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="h-4 w-4" />
              {fileStats ? `Importer ${fileStats.totalRows.toLocaleString()} articles` : 'Importer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
