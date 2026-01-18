import { useCallback } from "react"
import { identifyUser, trackEvent } from "~/lib/analytics/umami"

export function useAnalytics() {
  const track = useCallback(
    (event: string, data?: Record<string, unknown>) => {
      trackEvent(event, data)
    },
    []
  )

  const identify = useCallback(
    (userId: string, data?: Record<string, unknown>) => {
      identifyUser(userId, data)
    },
    []
  )

  return { track, identify }
}
