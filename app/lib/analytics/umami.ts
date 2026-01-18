declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void
      identify: (id: string, data?: Record<string, unknown>) => void
    }
  }
}

export function trackEvent(event: string, data?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(event, data)
  }
}

export function identifyUser(userId: string, data?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.identify(userId, data)
  }
}
