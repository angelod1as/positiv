import { useEffect } from "react"
import { useSearchParams } from "react-router"
import { trackEvent } from "~/lib/analytics/umami"

export const EMAIL_CONFIRMED_PARAM = "email-confirmado"

/**
 * The confirmation link is verified by a loader that only redirects, so the
 * browser never renders it. The loader flags the page it sends people to, and
 * this reports the landing from there.
 */
export function useTrackEmailConfirmed() {
  const [searchParams, setSearchParams] = useSearchParams()
  const confirmed = searchParams.has(EMAIL_CONFIRMED_PARAM)

  useEffect(() => {
    if (!confirmed) return

    trackEvent("email_confirmed")
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete(EMAIL_CONFIRMED_PARAM)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }, [confirmed, setSearchParams])
}
