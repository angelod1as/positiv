import type { AnalyticsEventName, AnalyticsEvents } from "./events"

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void
    }
  }
}

export type TrackEventArgs<Name extends AnalyticsEventName> =
  AnalyticsEvents[Name] extends undefined
    ? [name: Name]
    : [name: Name, data: AnalyticsEvents[Name]]

export function trackEvent<Name extends AnalyticsEventName>(
  ...[event, data]: TrackEventArgs<Name>
) {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(event, data)
  }
}
