import { useCallback, useMemo } from "react"
import { redirect, useNavigate, useSearchParams } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { buildRulesFlow } from "~/components/forms/custom/rules/build-rules-flow"
import { buildRulesQuestions } from "~/components/forms/custom/rules/build-rules-questions"
import type { CommitResult } from "~/components/forms/runtime/commit.types"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { OneAtATime } from "~/components/forms/runtime/presentations/one-at-a-time"
import type { Answers } from "~/components/forms/runtime/question.types"
import { RulesText } from "~/components/pages/events/rules/rules-text"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { kyselyDb } from "~/kysely-db"
import paths from "~/lib/paths"
import type { FCC } from "~types/utils/utils.types"
import type { Route } from "./+types/event-rules-page"

const {
  dash: {
    DASHBOARD,
    events: { EVENT_DATA, EVENT_RULES_QUIZ_CHECK },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) return redirect(DASHBOARD)

  await getUserContext(request, params)

  const event = await kyselyDb
    .selectFrom("events")
    .select("id")
    .where("id", "=", params.id)
    .executeTakeFirst()

  if (!event) return redirect(DASHBOARD)

  return null
}

const Wrapper: FCC = ({ children }) => (
  <>
    <RulesText />

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="mt-4">✅ Hora do teste! ✅</h2>
        </CardTitle>
        <CardDescription>
          <p>(As questões e respostas são automaticamente embaralhadas)</p>
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  </>
)

const STEP_PARAM = "q"

const EventRulesPage = ({ params }: Route.ComponentProps) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const eventId = params.id

  const requestedStep = searchParams.get(STEP_PARAM) ?? undefined

  const questions = useMemo(() => buildRulesQuestions(), [])

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> => {
      const response = await fetch(EVENT_RULES_QUIZ_CHECK(eventId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      })

      return (await response.json()) as CommitResult
    },
    [eventId],
  )

  const flow = useMemo(
    () => buildRulesFlow(questions, commit),
    [questions, commit],
  )

  return (
    <Wrapper>
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        persistence={{ formId: "rules", scopeId: eventId }}
        stepId={requestedStep}
        onStepChange={(step) => {
          setSearchParams(
            (current) => {
              const next = new URLSearchParams(current)
              next.set(STEP_PARAM, step)
              return next
            },
            {
              // The question the quiz opens on is where the reader already is;
              // only the ones they walk to are worth a trip back.
              replace: !requestedStep,
              // Every step is a navigation, and the quiz sits under the whole
              // rules text. Letting the router reset the scroll would throw the
              // reader back to the top of the rules on every answer.
              preventScrollReset: true,
            },
          )
        }}
        onDone={() => {
          void navigate(EVENT_DATA(eventId))
        }}
      />
    </Wrapper>
  )
}

export default EventRulesPage
