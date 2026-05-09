import {
  useCallback,
  useEffect,
  useId,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  /** Empêche la fermeture (ex. soumission en cours). */
  preventClose?: boolean
  /** Largeur max du panneau (classes Tailwind). @default max-w-2xl */
  maxWidthClassName?: string
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  preventClose = false,
  maxWidthClassName = 'max-w-2xl',
}: ModalProps) {
  const titleId = useId()

  const handleClose = useCallback(() => {
    if (preventClose) return
    onClose()
  }, [onClose, preventClose])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[90vh] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-[#0F2E4A] to-[#1e4a6e] px-5 py-4 text-white">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-white/80">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={preventClose}
            className="rounded-lg p-1.5 text-white/90 hover:bg-white/10 disabled:opacity-50"
            aria-label="Fermer la fenêtre"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
