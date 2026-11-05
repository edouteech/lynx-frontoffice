import Swal from 'sweetalert2'

export interface ConfirmDialogOptions {
  title: string
  text?: string
  html?: string
  icon?: 'warning' | 'question' | 'info' | 'error' | 'success'
  confirmButtonText?: string
  cancelButtonText?: string
  isDanger?: boolean
  confirmButtonColor?: string
}

/**
 * Boîte de dialogue de confirmation moderne SweetAlert2
 * Remplace avantageusement window.confirm partout dans l'application.
 */
export async function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    html: options.html,
    icon: options.icon ?? (options.isDanger ? 'warning' : 'question'),
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText ?? (options.isDanger ? 'Oui, continuer' : 'Confirmer'),
    cancelButtonText: options.cancelButtonText ?? 'Annuler',
    confirmButtonColor: options.confirmButtonColor ?? (options.isDanger ? '#DC2626' : '#2563EB'),
    cancelButtonColor: '#6B7280',
    reverseButtons: true,
    focusCancel: options.isDanger,
  })
  return result.isConfirmed
}

export function successToast(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false,
  })
}

export function errorAlert(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#2563EB',
  })
}

