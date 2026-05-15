// lynx_front/src/api/subscriptionEvents.ts
const eventTarget = new EventTarget()

export function notifySuspended() {
  eventTarget.dispatchEvent(new Event('subscription_suspended'))
}

export function subscribeToSuspension(callback: () => void) {
  eventTarget.addEventListener('subscription_suspended', callback)
  return () => {
    eventTarget.removeEventListener('subscription_suspended', callback)
  }
}
