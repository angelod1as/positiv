import { type EmailOtpType } from "@supabase/supabase-js"
import { type LoaderFunctionArgs } from "react-router"
import { redirectWithError, redirectWithSuccess } from "remix-toast"
import { verifyEmailOtp } from "~/business/auth/confirm-otp.server"
import { authConfirmCopy } from "~/copy/auth"
import { EMAIL_CONFIRMED_PARAM } from "~/lib/hooks/use-track-email-confirmed"
import paths from "~/lib/paths"

const {
  auth: { LOGIN },
} = paths

export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const next = requestUrl.searchParams.get("next") || "/"
  const headers = new Headers()

  if (token_hash && type) {
    const { error } = await verifyEmailOtp({
      request,
      headers,
      type,
      token_hash,
    })

    if (!error) {
      const successMessage =
        type === "recovery"
          ? authConfirmCopy.passwordReset
          : authConfirmCopy.emailConfirmed

      let landing = next
      if (type === "email" || type === "signup") {
        const flagged = new URL(next, requestUrl.origin)
        flagged.searchParams.set(EMAIL_CONFIRMED_PARAM, "1")
        landing = `${flagged.pathname}${flagged.search}${flagged.hash}`
      }

      return redirectWithSuccess(landing, successMessage, { headers })
    }

    if (
      error.message.includes("Token has expired") ||
      error.message.includes("invalid") ||
      error.code === "otp_expired"
    ) {
      throw await redirectWithError(LOGIN, authConfirmCopy.linkExpired)
    }

    throw await redirectWithError(
      LOGIN,
      authConfirmCopy.confirmFailed(
        error.message || authConfirmCopy.invalidLinkReason,
      ),
    )
  }

  throw await redirectWithError(LOGIN, authConfirmCopy.invalidLink)
}
