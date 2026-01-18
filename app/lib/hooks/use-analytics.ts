import { useCallback } from "react"
import { trackEvent } from "~/lib/analytics/umami"

export function useAnalytics() {
  const track = useCallback(
    (event: string, data?: Record<string, unknown>) => {
      trackEvent(event, data)
    },
    []
  )

  return { track }
}
