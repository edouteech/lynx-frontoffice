import { useRef, useState } from 'react'
import Modal from '../../components/Modal'
import { Download, UploadCloud } from 'lucide-react'
import {
  downloadCustomerTemplate,
  importCustomers,
  type CustomerImportResults,
} from '../../api/customer'
import { getApiErrorMessage } from '../../lib/apiError'
import Swal from 'sweetalert2'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Compte rendu d'import fidèle : créés, mis à jour, ignorés, doublons et erreurs sont
 * séparés. « X importés avec succès » seul laissait croire que X clients avaient été créés
 * alors que des lignes avaient seulement mis à jour un client existant.
 */
function buildImportReport(r: CustomerImportResults): { html: string; needsAttention: boolean } {
  const created = r.created ?? r.success
  const updated = r.updated ?? 0
  const skipped = r.skipped ?? 0
  const duplicates = r.duplicates_in_file ?? 0
  const ignoredSheets = r.ignored_sheets ?? []

  const lines: string[] = []
  if (r.rows_read !== undefined) {
    lines.push(
      `<b>${r.rows_read}</b> ligne(s) lue(s)${r.sheet ? ` dans la feuille « ${escapeHtml(r.sheet)} »` : ''}.`
    )
  }
  lines.push(`<span style="color:#15803d">✔ <b>${created}</b> client(s) créé(s)</span>`)
  if (updated > 0) {
    lines.push(`↻ <b>${updated}</b> client(s) existant(s) mis à jour (même e-mail déjà enregistré)`)
  }
  if (duplicates > 0) {
    lines.push(
      `<span style="color:#b45309">⚠ <b>${duplicates}</b> ligne(s) avec un e-mail déjà présent plus haut dans le fichier : aucun nouveau client n'a été créé pour elles</span>`
    )
  }
  if (skipped > 0) lines.push(`${skipped} ligne(s) vide(s) ignorée(s)`)
  if (r.errors > 0) {
    lines.push(`<span style="color:#dc2626">✖ <b>${r.errors}</b> erreur(s)</span>`)
  }
  for (const sheet of ignoredSheets) {
    lines.push(
      `<span style="color:#b45309">⚠ La feuille « ${escapeHtml(sheet.name)} » contient aussi ${sheet.rows} ligne(s) de clients : <b>elle n'a pas été importée</b> (une seule feuille est lue à la fois).</span>`
    )
  }

  let html = `<div style="text-align:left;line-height:1.7">${lines.join('<br>')}</div>`

  const details = (r.error_details ?? []).slice(0, 10)
  if (details.length > 0) {
    const more = (r.error_details?.length ?? 0) - details.length
    html +=
      `<ul style="text-align:left;margin-top:12px;max-height:180px;overflow:auto;font-size:12px;color:#6b7280">` +
      details.map((d) => `<li>${escapeHtml(d)}</li>`).join('') +
      (more > 0 ? `<li>… et ${more} autre(s)</li>` : '') +
      `</ul>`
  }

  return {
    html,
    needsAttention: r.errors > 0 || duplicates > 0 || ignoredSheets.length > 0 || (created === 0 && updated > 0),
  }
}

export function CustomerImportModal({ open, onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const handleDownloadTemplate = async () => {
    try {
      await downloadCustomerTemplate()
    } catch (e) {
      Swal.fire('Erreur', 'Impossible de télécharger le modèle', 'error')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)

    try {
      const results = await importCustomers(file)
      const { html, needsAttention } = buildImportReport(results)

      await Swal.fire({
        title: 'Importation terminée',
        html,
        icon: needsAttention ? 'warning' : 'success',
        width: 640,
      })
      onSuccess()
      onClose()
    } catch (err) {
      Swal.fire('Erreur', getApiErrorMessage(err), 'error')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importer des clients"
      subtitle="Importez vos clients en masse à partir d'un fichier Excel."
      preventClose={importing}
      maxWidthClassName="max-w-xl"
    >
      <div className="space-y-6 py-2">
        <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Étape 1 : Format du fichier</p>
            <p className="mt-0.5 text-blue-800">
              Téléchargez le modèle et remplissez-le avec vos données.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleDownloadTemplate()}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-blue-600 shadow-sm border border-blue-200 hover:bg-blue-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </button>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition-colors hover:border-gray-400">
          <UploadCloud className="mb-3 h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            Étape 2 : Uploader le fichier rempli
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Fichiers supportés : .xlsx, .xls, .csv (Max 10MB)
          </p>
          <button
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#2563EB] disabled:opacity-50"
          >
            Parcourir les fichiers
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => void handleFileUpload(e)}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
          />
        </div>
      </div>
      
      {importing && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#3B82F6] font-medium">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent"></div>
          Importation en cours, veuillez patienter...
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={importing}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </Modal>
  )
}
