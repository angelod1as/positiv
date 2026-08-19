import { useCallback, useEffect, useMemo, useRef } from "react"
import {
  redirect,
  useNavigate,
  useNavigationType,
  useSearchParams,
} from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { buildRulesFlow } from "~/components/forms/custom/rules/build-rules-flow"
import { buildRulesQuestions } from "~/components/forms/custom/rules/build-rules-questions"
import type { CommitResult } from "~types/forms/commit.types"
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
  const navigationType = useNavigationType()
  const [searchParams, setSearchParams] = useSearchParams()
  const eventId = params.id

  const mirrored = searchParams.get(STEP_PARAM) ?? undefined

  // The last question the reader asked for: the one the page opened on, and
  // then whichever the back and forward buttons land on. It has to keep up with
  // them, because the quiz takes a beat to follow and this page writes down the
  // question it is leaving in the meantime — pinning this to where the page
  // opened would hand that write back as an instruction.
  const askedFor = useRef(mirrored)

  // Only to carry it forward: on the render a back or forward button causes,
  // the branch below already reads the right thing, because navigationType and
  // the url change together. This is what keeps it around for the renders after
  // that, which are this page's own writes.
  useEffect(() => {
    if (navigationType === "POP") askedFor.current = mirrored
  }, [navigationType, mirrored])

  // The url says where the reader is only when the reader put them there: the
  // question the page opened on, and the back and forward buttons. Every other
  // change to it is this page writing down the question it is showing, and that
  // write can land after the quiz has already moved on — obeying it then drags
  // the reader back to a question they have answered.
  const requestedStep = navigationType === "POP" ? mirrored : askedFor.current

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
              replace: !mirrored,
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
