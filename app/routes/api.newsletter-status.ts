import type { LoaderFunctionArgs } from "react-router"
import { getSubscriptionStatus } from "~/business/newsletter/subscription-helpers.server"
import { newsletterPreferenceCookie } from "~/business/session.server"

/**
 * API endpoint to check newsletter subscription status for a profile
 * Returns whether the newsletter modal should be shown
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const profileId = url.searchParams.get("profileId")

  if (!profileId) {
    return Response.json({ error: "profileId is required" }, { status: 400 })
  }

  try {
    const subscriptionResult = await getSubscriptionStatus(profileId)
    const subscription = subscriptionResult.success
      ? subscriptionResult.data
      : null
    const isNotSubscribed = !subscription || !subscription.consent_given
    const shouldShow = isNotSubscribed

    const headers = new Headers()
    headers.append(
      "Set-Cookie",
      await newsletterPreferenceCookie.serialize({
        checked: true,
        shouldShow,
      }),
    )

    return Response.json({ shouldShow }, { headers })
  } catch (error) {
    console.error("Error checking newsletter status:", error)
    return Response.json(
      { error: "Failed to check newsletter status" },
      { status: 500 },
    )
  }
}
