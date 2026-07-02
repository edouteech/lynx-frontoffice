import { useRef, useState } from 'react'
import Modal from '../../components/Modal'
import { Download, UploadCloud } from 'lucide-react'
import { downloadCustomerTemplate, importCustomers } from '../../api/customer'
import { getApiErrorMessage } from '../../lib/apiError'
import Swal from 'sweetalert2'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
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
      let message = `${results.success} client(s) importé(s) avec succès.`
      if (results.errors > 0) {
        message += `<br><br><span class="text-red-500">${results.errors} erreur(s) rencontrée(s).</span>`
      }
      
      await Swal.fire({
        title: 'Importation terminée',
        html: message,
        icon: results.errors > 0 ? 'warning' : 'success',
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
