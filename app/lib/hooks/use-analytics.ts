import { trackEvent } from "~/lib/analytics/umami"

export function useAnalytics() {
  return { track: trackEvent }
}
