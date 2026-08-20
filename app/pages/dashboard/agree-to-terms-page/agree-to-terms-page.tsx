import { SirenIcon } from "lucide-react"
import { Fragment, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { getUserContext } from "~/business/auth/auth.server"
import { getSubscriptionStatus } from "~/business/newsletter/subscription-helpers.server"
import type { TermsAgreementResult } from "~/business/participant/save-terms-agreement.server"
import { Copy } from "~/components/atoms/copy/copy"
import { buildTermsQuestions } from "~/components/forms/custom/terms/build-terms-questions"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { gridPresentation } from "~/components/forms/runtime/presentations/grid"
import type { Answers } from "~/components/forms/runtime/question.types"
import { buildSingleScreenFlow } from "~/components/forms/runtime/single-screen-flow"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { agreeToTermsCopy } from "~/copy/dashboard"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/agree-to-terms-page"

const {
  dash: {
    account: { BASIC_DATA, TERMS_COMMIT },
  },
} = paths

// Built once: a presentation that changes identity remounts the run, and with
// it every box already ticked. The two e-mail choices share a row, the way they
// always have.
const TermsScreen = gridPresentation([
  { kind: "question", id: "agree", span: 12 },
  { kind: "question", id: "commonEmails", span: 6 },
  { kind: "question", id: "mktEmails", span: 6 },
])

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.agreeToTerms.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)

  // Get newsletter subscription status from the new table
  let mktEmails: boolean | undefined = undefined
  if (currentProfile) {
    const result = await getSubscriptionStatus(currentProfile.id)
    if (result.success && result.data) {
      mktEmails = result.data.consent_given
    }
  }

  return { mktEmails }
}

const AgreeToTermsPage = ({ loaderData }: Route.ComponentProps) => {
  const { mktEmails } = loaderData
  const navigate = useNavigate()

  const questions = useMemo(() => buildTermsQuestions(), [])

  // The newsletter opens where the person left it; someone arriving for the
  // first time is offered it ticked.
  const initialAnswers = useMemo(
    () => ({
      agree: false,
      commonEmails: true,
      mktEmails: mktEmails === undefined ? true : mktEmails,
    }),
    [mktEmails],
  )

  // Whether the newsletter part of the save failed. Held in a ref rather than
  // in state because the run is over by the time it is read, and a render in
  // between would only redraw a form nobody is looking at any more.
  const newsletterFailed = useRef(false)

  const commit = useCallback(
    async (answers: Answers): Promise<TermsAgreementResult> => {
      const response = await fetch(TERMS_COMMIT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      })

      // A session that expired mid-form is answered with a redirect, which
      // fetch follows to a page of HTML. Reading that as JSON would only say
      // the save failed, when what someone needs is to sign in again.
      if (response.redirected) {
        void navigate(new URL(response.url).pathname)
        return { ok: false, errors: [] }
      }

      const result = (await response.json()) as TermsAgreementResult
      if (result.ok) newsletterFailed.current = result.newsletterFailed

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

      <FormRunner
        questions={questions}
        flow={flow}
        presentation={TermsScreen}
        initialAnswers={initialAnswers}
        continueLabel={agreeToTermsCopy.buttonLabel}
        onDone={() => {
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
