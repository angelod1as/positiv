import { useCallback, useRef, useState } from "react"
import { redirect, useNavigate } from "react-router"
import { toast } from "sonner"
import { getUserContext } from "~/business/auth/auth.server"
import { findEmailPreferences } from "~/business/newsletter/email-preferences.server"
import { Copy } from "~/components/atoms/copy/copy"
import { Error } from "~/components/forms/base/error"
import { EmailConsentForm } from "~/components/forms/custom/email-consent/email-consent-form"
import { commitJson } from "~/components/forms/runtime/commit-json"
import type { Answers } from "~/components/forms/runtime/question.types"
import { emailsPageCopy } from "~/copy/emails"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"
import type { Route } from "./+types/emails-page"

const {
  root: { HOME, EMAILS_COMMIT },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.emails.title)
}

/**
 * The token in the URL opens the page without a login, so it must not leave in
 * a Referer nor sit in a shared cache.
 */
export function headers({}: Route.HeadersArgs) {
  return {
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "private, no-store",
  }
}

/**
 * Opens from the token in an email footer, with no login, or for the person
 * logged in. A token that opens nothing falls back to the login, so a link
 * from an old email still ends somewhere useful.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const token = new URL(request.url).searchParams.get("t")

  if (token) {
    const byToken = await findEmailPreferences({ token })
    if (byToken.success && byToken.data) {
      const { email, preferences } = byToken.data
      return { token, email, preferences }
    }
  }

  const { currentProfile } = await getUserContext(request, params)
  const byProfile = currentProfile
    ? await findEmailPreferences({ profileId: currentProfile.id })
    : null
  if (!byProfile?.success || !byProfile.data) {
    throw redirect(HOME)
  }

  const { email, preferences } = byProfile.data
  return { token: null, email, preferences }
}

const EmailsPage = ({ loaderData }: Route.ComponentProps) => {
  const { token, email, preferences } = loaderData
  const navigate = useNavigate()
  const [bounced, setBounced] = useState(false)
  const lastBounced = useRef(false)

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> => {
      const result = await commitJson<{ bounced: boolean }>(
        EMAILS_COMMIT,
        token ? { token, answers } : { answers },
        (pathname) => void navigate(pathname),
      )
      lastBounced.current = result.ok && result.bounced === true
      return result
    },
    [token, navigate],
  )

  return (
    <div className="flex flex-col w-full max-w-2xl gap-8 mx-auto my-12 px-4">
      <div>
        <h1>{emailsPageCopy.title}</h1>
        <div className="text-muted-foreground">
          <Copy>{emailsPageCopy.description(email)}</Copy>
        </div>
      </div>

      {bounced ? <Error role="alert">{emailsPageCopy.bounced}</Error> : null}

      <EmailConsentForm
        initialPreferences={preferences}
        commit={commit}
        onDone={() => {
          setBounced(lastBounced.current)
          if (!lastBounced.current) {
            toast.success(emailsPageCopy.successToast)
          }
        }}
      />
    </div>
  )
}

export default EmailsPage
