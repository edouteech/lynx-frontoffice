type Listener = () => void

let unauthorizedListener: Listener | null = null

export function setUnauthorizedListener(fn: Listener | null): void {
  unauthorizedListener = fn
}

export function notifyUnauthorized(): void {
  unauthorizedListener?.()
}
