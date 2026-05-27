import { useEffect, useMemo, useState } from 'react'
import { FileText, Image as ImageIcon, Save } from 'lucide-react'
import { fetchStores } from '../../api/stores'
import { fetchReceiptSetting, updateReceiptSetting } from '../../api/receiptSetting'
import type { Store } from '../../types/api'
import type { ReceiptSetting } from '../../types/receiptSetting'
import { resolveBackendUrl } from '../../lib/url'
import Swal from 'sweetalert2'

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function LogoPicker({
  label,
  previewUrl,
  onPick,
}: {
  label: string
  previewUrl: string | null
  onPick: (file: File | null) => void
}) {
  return (
    <label
      className="block rounded-xl border border-gray-100 bg-white p-4"
      title={label}
    >
      <div className="mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ImageIcon className="h-4 w-4 text-gray-600" />
          {label}
        </div>
        <div className="mt-1 text-xs text-gray-600">
          Clique sur l’image pour ajouter ou remplacer.
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        aria-label={label}
      />

      <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-[#EFF6FF]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className="h-30 w-full bg-white object-contain"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="flex h-30 w-full items-center justify-center bg-[#EFF6FF]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <ImageIcon className="h-6 w-6 text-gray-500" />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
          <div className="rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-gray-900 opacity-0 shadow-sm transition group-hover:opacity-100">
            Cliquer pour changer
          </div>
        </div>
      </div>
    </label>
  )
}

export default function ReceiptSettingPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<ReceiptSetting | null>(null)
  const [headerText, setHeaderText] = useState('')
  const [footerText, setFooterText] = useState('')
  const [sentLogoFile, setSentLogoFile] = useState<File | null>(null)
  const [printedLogoFile, setPrintedLogoFile] = useState<File | null>(null)

  const currentStore = useMemo(
    () => stores.find((m) => m.id === storeId) ?? null,
    [stores, storeId]
  )

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setError(null)
        setLoading(true)
        const res = await fetchStores(1)
        const list = res.data ?? []
        if (cancelled) return
        setStores(list)
        setStoreId(list[0]?.id ?? null)
      } catch {
        if (!cancelled) setError('Impossible de charger les magasins.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!storeId) return
      try {
        setError(null)
        setLoading(true)
        const pr = await fetchReceiptSetting(storeId)
        if (cancelled) return
        setData(pr)
        setHeaderText(pr.header_text ?? '')
        setFooterText(pr.footer_text ?? '')
        setSentLogoFile(null)
        setPrintedLogoFile(null)
      } catch {
        if (!cancelled) setError('Impossible de charger les paramètres reçus.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [storeId])

  const previewSentLogo = useMemo(() => {
    if (sentLogoFile) return URL.createObjectURL(sentLogoFile)
    return resolveBackendUrl(data?.sent_receipt_logo) ?? null
  }, [sentLogoFile, data?.sent_receipt_logo])

  const previewPrintedLogo = useMemo(() => {
    if (printedLogoFile) return URL.createObjectURL(printedLogoFile)
    return resolveBackendUrl(data?.printed_receipt_logo) ?? null
  }, [printedLogoFile, data?.printed_receipt_logo])

  async function save() {
    if (!storeId) return

    const result = await Swal.fire({
      title: 'Enregistrer les modifications ?',
      text: 'Voulez-vous enregistrer les paramètres de reçu pour ce magasin ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, enregistrer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#EF4444',
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    setSaving(true)
    setError(null)

    Swal.fire({
      title: 'Enregistrement en cours...',
      text: 'Veuillez patienter pendant la mise à jour.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const updated = await updateReceiptSetting(storeId, {
        header_text: headerText,
        footer_text: footerText,
        sent_receipt_logo: sentLogoFile,
        printed_receipt_logo: printedLogoFile,
      })
      setData(updated)
      setSentLogoFile(null)
      setPrintedLogoFile(null)
      Swal.fire({
        title: 'Enregistré !',
        text: 'Les paramètres de reçu ont été mis à jour avec succès.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      })
    } catch {
      setError("Impossible d’enregistrer les paramètres reçus.")
      Swal.fire({
        title: 'Erreur',
        text: "Impossible d’enregistrer les paramètres de reçu.",
        icon: 'error',
        confirmButtonColor: '#3B82F6',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configuration des reçus par magasin.
          </p>
        </div>

        <div className="w-full sm:w-80">
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Magasin
          </label>
          <select
            value={storeId ?? ''}
            onChange={(e) => setStoreId(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
            disabled={loading || stores.length === 0}
            aria-label="Magasin"
            title="Magasin"
          >
            {stores.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Card
          title="Textes"
          subtitle={
            currentStore
              ? `Magasin : ${currentStore.name}`
              : 'Sélectionnez un magasin.'
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <FileText className="h-4 w-4" />
                En-tête
              </div>
              <textarea
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                placeholder="Texte en haut du reçu…"
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <FileText className="h-4 w-4" />
                Pied de page
              </div>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                placeholder="Texte en bas du reçu…"
              />
            </div>
          </div>
        </Card>

        <Card title="Logos">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <LogoPicker
                label="Logo reçu envoyé"
                previewUrl={previewSentLogo}
                onPick={setSentLogoFile}
              />

              <LogoPicker
                label="Logo reçu imprimé"
                previewUrl={previewPrintedLogo}
                onPick={setPrintedLogoFile}
              />
            </div>

            <button
              type="button"
              disabled={saving || loading || !storeId}
              onClick={save}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
