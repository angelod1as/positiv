import { SirenIcon } from "lucide-react"
import { Fragment, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { getUserContext } from "~/business/auth/auth.server"
import { getSubscriptionStatus } from "~/business/newsletter/subscription-helpers.server"
import { Copy } from "~/components/atoms/copy/copy"
import { buildTermsQuestions } from "~/components/forms/custom/terms/build-terms-questions"
import { commitJson } from "~/components/forms/runtime/commit-json"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { gridPresentation } from "~/components/forms/runtime/presentations/grid"
import type { Answers } from "~/components/forms/runtime/question.types"
import type { CommitResult } from "~types/forms/commit.types"
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

      <FormRunner
        questions={questions}
        flow={flow}
        presentation={TermsScreen}
        initialAnswers={initialAnswers}
        continueLabel={agreeToTermsCopy.buttonLabel}
        pendingLabel={agreeToTermsCopy.pendingButtonLabel}
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
