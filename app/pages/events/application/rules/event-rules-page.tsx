import { useCallback, useMemo } from "react"
import { redirect, useNavigate, useSearchParams } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { rulesSessionStorage } from "~/business/session.server"
import { buildRulesFlow } from "~/components/forms/custom/rules/build-rules-flow"
import { buildRulesQuestions } from "~/components/forms/custom/rules/build-rules-questions"
import { getRulesFormSchema } from "~/components/forms/custom/rules/rules-form-schema"
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
import { trackServerEvent } from "~/lib/analytics/umami.server"
import paths from "~/lib/paths"
import type { FCC } from "~types/utils/utils.types"
import type { Route } from "./+types/event-rules-page"

const {
  dash: {
    DASHBOARD,
    events: { EVENT_DATA, EVENT_RULES },
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

export async function action({ request, params }: Route.ActionArgs) {
  if (!params.id) return redirect(DASHBOARD)

  await getUserContext(request, params)

  const event = await kyselyDb
    .selectFrom("events")
    .select("event_type")
    .where("id", "=", params.id)
    .executeTakeFirst()

  if (!event) return redirect(DASHBOARD)

  let answers: Record<string, unknown>
  try {
    answers = (await request.json()) as Record<string, unknown>
  } catch {
    // No question is to blame for a body the server cannot read, so the runtime
    // is left to say the save failed.
    return Response.json({ ok: false, errors: [] }, { status: 400 })
  }

  // The same schemas the browser used. Answering in the browser is what makes
  // the quiz usable; checking again here is what makes it a gate, because a
  // bare POST to this route used to open it without answering anything.
  const errors = Object.entries(getRulesFormSchema(event.event_type)).flatMap(
    ([questionId, schema]) => {
      const result = schema.safeParse(answers[questionId])

      return result.success
        ? []
        : [{ questionId, message: result.error.issues[0].message }]
    },
  )

  if (errors.length > 0) return Response.json({ ok: false, errors })

  const { commitSession, getSession } = rulesSessionStorage
  const session = await getSession(request.headers.get("Cookie"))
  session.set("rulesCorrect", true)

  trackServerEvent(
    "rules_quiz_passed",
    { eventId: params.id },
    `/events/${params.id}/rules`,
  )

  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": await commitSession(session) } },
  )
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

const EventRulesPage = ({ loaderData, params }: Route.ComponentProps) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const eventId = params.id

  const requestedStep = searchParams.get(STEP_PARAM) ?? undefined

  const questions = useMemo(
    () => buildRulesQuestions(loaderData.eventType),
    [loaderData.eventType],
  )

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> => {
      const response = await fetch(EVENT_RULES(eventId), {
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
            // The question the quiz opens on is where the reader already is;
            // only the ones they walk to are worth a trip back.
            { replace: !requestedStep },
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
