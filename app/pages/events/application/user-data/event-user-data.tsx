import { useCallback, useMemo, useRef } from "react"
import { data, redirect, useNavigate } from "react-router"
import { toast } from "sonner"
import {
  hasPassedRulesQuiz,
  rulesSessionStorage,
} from "~/business/session.server"
import { Copy } from "~/components/atoms/copy/copy"
import { buildApplicationQuestions } from "~/components/forms/custom/application/build-application-questions"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { AllAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import type { Answers } from "~/components/forms/runtime/question.types"
import { buildSingleScreenFlow } from "~/components/forms/runtime/single-screen-flow"
import { eventApplicationCopy } from "~/copy/events"
import { useAnalytics } from "~/lib/hooks/use-analytics"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"
import type { Route } from "./+types/event-user-data"

const {
  dash: {
    events: {
      EVENT_APPLICATION_COMMIT,
      EVENT_APPLICATION_SENT,
      EVENT_RULES,
    },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  const { commitSession, getSession } = rulesSessionStorage
  const session = await getSession(request.headers.get("Cookie"))
  if (!hasPassedRulesQuiz(session, params.id)) {
    return redirect(EVENT_RULES(params.id))
  }

  // The submit reads this same cookie, and it lives half an hour. Someone
  // writing their answers slowly would reach the button after it expired, so
  // the clock restarts every time they are here.
  return data(null, {
    headers: { "Set-Cookie": await commitSession(session) },
  })
}

type ApplicationAnswer = CommitResult & { emailSent?: boolean }

const EventUserInfo = ({ params }: Route.ComponentProps) => {
  const navigate = useNavigate()
  const { track } = useAnalytics()
  const eventId = params.id

  const emailSentRef = useRef(true)

  const questions = useMemo(() => buildApplicationQuestions(), [])

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> => {
      track("event_application_clicked", { eventId })

      const response = await fetch(EVENT_APPLICATION_COMMIT(eventId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      })

      // The quiz is what opens this form, and its cookie outlives the page by
      // half an hour. Somebody who took longer than that is not at fault and
      // is not stuck: the quiz is where they can earn their way back in.
      if (response.status === 403) {
        void navigate(EVENT_RULES(eventId))

        // The route takes a moment to swap, and the runtime writes its own
        // "could not save, try again" under the button meanwhile — the one
        // thing that will not work.
        return {
          ok: false,
          errors: [],
          message: eventApplicationCopy.quizExpired,
        }
      }

      const result = (await response.json()) as ApplicationAnswer

      // A refusal the form cannot pin on any question — registration closed
      // between the quiz and the button, say — travels as the result's own
      // message, which the runtime shows in place of its generic one.
      if (!result.ok) return result

      emailSentRef.current = result.emailSent ?? true

      return { ok: true }
    },
    [eventId, navigate, track],
  )

  const flow = useMemo(
    // The step names are the ones a run left half-written already carries:
    // a stored record naming a step this flow does not have is discarded.
    () =>
      buildSingleScreenFlow(questions, commit, {
        screenId: "form",
        commitId: "commit",
      }),
    [questions, commit],
  )

  return (
    <>
      <h1>{eventApplicationCopy.title}</h1>
      <Copy>{eventApplicationCopy.intro}</Copy>

      <FormRunner
        questions={questions}
        flow={flow}
        presentation={AllAtOnce}
        persistence={{ formId: "event-application", scopeId: eventId }}
        continueLabel={eventApplicationCopy.submitLabel}
        onDone={() => {
          if (!emailSentRef.current) {
            const { message, description } =
              eventApplicationCopy.toasts.emailFailed

            toast.warning(message, { description, duration: 6000 })
          }

          void navigate(EVENT_APPLICATION_SENT(eventId))
        }}
      />
    </>
  )
}

export default EventUserInfo
