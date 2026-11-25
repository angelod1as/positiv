import { SirenIcon } from "lucide-react"
import { Fragment, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { getUserContext } from "~/business/auth/auth.server"
import { findEmailPreferences } from "~/business/newsletter/email-preferences.server"
import type { EmailPreferences } from "~/business/newsletter/email-preferences-schema"
import { Copy } from "~/components/atoms/copy/copy"
import { renderEmailConsentQuestion } from "~/components/forms/custom/email-consent/render-email-consent-question"
import { buildTermsQuestions } from "~/components/forms/custom/terms/build-terms-questions"
import { commitJson } from "~/components/forms/runtime/commit-json"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { gridPresentation } from "~/components/forms/runtime/presentations/grid"
import type { Answers } from "~/components/forms/runtime/question.types"
import type { CommitResult } from "~types/forms/commit.types"
import { buildSingleScreenFlow } from "~/components/forms/runtime/single-screen-flow"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { agreeToTermsCopy } from "~/copy/dashboard"
import { emailConsentCopy } from "~/copy/emails"
import { metaCopy } from "~/copy/meta"
import { trackEvent } from "~/lib/analytics/umami"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/agree-to-terms-page"

const {
  dash: {
    account: { BASIC_DATA, TERMS_COMMIT },
  },
} = paths

// Built once: a presentation that changes identity remounts the run, and with
// it every box already ticked.
const TermsScreen = gridPresentation([
  { kind: "question", id: "agree", span: 12 },
  {
    kind: "note",
    id: "alwaysSent",
    render: (
      <div className="text-muted-foreground">
        <Copy>{emailConsentCopy.alwaysSent}</Copy>
      </div>
    ),
    span: 12,
  },
  { kind: "question", id: "registrationAlerts", span: 12 },
  { kind: "question", id: "newsletter", span: 12 },
  { kind: "question", id: "marketing", span: 12 },
])

const ALL_TICKED: EmailPreferences = {
  registrationAlerts: true,
  newsletter: true,
  marketing: true,
}

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.agreeToTerms.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)

  // Someone signing up has nothing on record and sees every category ticked.
  const found = currentProfile
    ? await findEmailPreferences({ profileId: currentProfile.id })
    : null
  const preferences: EmailPreferences =
    found?.success && found.data ? found.data.preferences : ALL_TICKED

  return { preferences }
}

const AgreeToTermsPage = ({ loaderData }: Route.ComponentProps) => {
  const { preferences } = loaderData
  const navigate = useNavigate()

  const questions = useMemo(() => buildTermsQuestions(), [])

  const initialAnswers = useMemo(
    () => ({ agree: false, ...preferences }),
    [preferences],
  )

  // Whether the newsletter part of the save failed. Held in a ref rather than
  // in state because the run is over by the time it is read, and a render in
  // between would only redraw a form nobody is looking at any more.
  const newsletterFailed = useRef(false)

  const commit = useCallback(
    // The verdict is what the run reads; whether the newsletter took the
    // address is this page's own business, and is kept in the ref above.
    async (answers: Answers): Promise<CommitResult> => {
      const result = await commitJson<{ newsletterFailed: boolean }>(
        TERMS_COMMIT,
        answers,
        (pathname) => void navigate(pathname),
      )

      // A save that worked without saying whether the newsletter did is read as
      // one that did: the thanks that follows says so, and claiming a failure
      // nobody reported would send someone chasing nothing.
      if (result.ok) newsletterFailed.current = result.newsletterFailed ?? false

      return result
    },
    [navigate],
  )

  const flow = useMemo(
    () => buildSingleScreenFlow(questions, commit),
    [questions, commit],
  )

  return (
    <>
      <h1>{agreeToTermsCopy.title}</h1>
      <Alert variant="destructive">
        <SirenIcon className="h-4 w-4" />
        <AlertTitle>{agreeToTermsCopy.alert.title}</AlertTitle>
        <AlertDescription>{agreeToTermsCopy.alert.body}</AlertDescription>
      </Alert>
      {agreeToTermsCopy.sections.map((section) => (
        <Fragment key={section.heading}>
          <h2>{section.heading}</h2>
          <Copy>{section.body}</Copy>
        </Fragment>
      ))}
      <Copy>{agreeToTermsCopy.privacyPolicy}</Copy>

      <FormRunner
        questions={questions}
        flow={flow}
        presentation={TermsScreen}
        renderQuestion={renderEmailConsentQuestion}
        initialAnswers={initialAnswers}
        continueLabel={agreeToTermsCopy.buttonLabel}
        pendingLabel={agreeToTermsCopy.pendingButtonLabel}
        onDone={() => {
          trackEvent("terms_accepted")

          if (newsletterFailed.current) {
            toast.warning(agreeToTermsCopy.newsletterWarning, {
              duration: Infinity,
              closeButton: true,
            })
          } else {
            toast.success(agreeToTermsCopy.successToast)
          }

          void navigate(BASIC_DATA)
        }}
      />
    </>
  )
}

export default AgreeToTermsPage
