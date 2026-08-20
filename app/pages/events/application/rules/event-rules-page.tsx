import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  redirect,
  useNavigate,
  useNavigationType,
  useSearchParams,
} from "react-router"
import { ENV } from "varlock/env"
import { getUserContext } from "~/business/auth/auth.server"
import { isVeteran } from "~/business/participant/is-veteran.server"
import { buildCorrectRulesAnswers } from "~/components/forms/custom/rules/build-correct-rules-answers"
import {
  buildRulesFlow,
  SHORT_RUN_LENGTH,
} from "~/components/forms/custom/rules/build-rules-flow"
import {
  buildRulesQuestions,
  dealOf,
} from "~/components/forms/custom/rules/build-rules-questions"
import {
  clearRulesDeal,
  readRulesDeal,
  writeRulesDeal,
} from "~/components/forms/custom/rules/rules-order"
import type { CommitResult } from "~types/forms/commit.types"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { OneAtATime } from "~/components/forms/runtime/presentations/one-at-a-time"
import type { Answers } from "~/components/forms/runtime/question.types"
import { RulesText } from "~/components/pages/events/rules/rules-text"
import { Button } from "~/components/atoms/button/button"
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
import { rulesQuizCopy } from "~/copy/events"

const {
  dash: {
    DASHBOARD,
    events: { EVENT_DATA, EVENT_RULES_QUIZ_CHECK },
  },
} = paths

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) return redirect(DASHBOARD)

  const { currentProfile } = await getUserContext(request, params)

  const event = await kyselyDb
    .selectFrom("events")
    .select("id")
    .where("id", "=", params.id)
    .executeTakeFirst()

  if (!event) return redirect(DASHBOARD)

  // Asked here rather than taken from the browser: the quiz is a gate, and the
  // shorter run behind it has to be earned against the database.
  return {
    isVeteran: currentProfile
      ? await isVeteran(currentProfile.id, params.id)
      : false,
    profileId: currentProfile?.id ?? "",
  }
}

type WrapperProps = { notice?: string }

const Wrapper: FCC<WrapperProps> = ({ children, notice }) => (
  <>
    <RulesText />

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="mt-4">{rulesQuizCopy.title}</h2>
        </CardTitle>
        <CardDescription>
          <p>{rulesQuizCopy.shuffleNotice}</p>
          {notice ? <p className="mt-2">{notice}</p> : null}
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  </>
)

const STEP_PARAM = "q"

const EventRulesPage = ({ params, loaderData }: Route.ComponentProps) => {
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const [searchParams, setSearchParams] = useSearchParams()
  const eventId = params.id

  // A tab can see two people sign in, and the run kept in session storage
  // outlives the sign-out. Keyed by the event alone, the second person resumed
  // the first one's quiz — on a question the flow they are owed may never ask,
  // with answers that were not theirs.
  const runId = `${eventId}:${loaderData.profileId}`

  // How long the run says it will be, which is the only thing that knows
  // whether a veteran is still on the short path: the wager is on while three
  // screens are promised, and off the moment the quiz grows.
  //
  // Stamped with the run it belongs to rather than reset when that changes:
  // the runner reports its length after it has restored itself, so a plain
  // reset would leave the person who just signed in reading the line the last
  // one earned until the report lands.
  const [screens, setScreens] = useState<{
    runId: string
    total: number
  } | null>(null)

  const screensAhead = screens?.runId === runId ? screens.total : null

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

  // Entries this page pushed for questions the reader walked to. The quiz's own
  // back button pops one instead of adding another, so that both back buttons
  // walk the same trail: an added entry would leave the question just left
  // sitting behind the reader for the browser's to hand straight back.
  //
  // Never more than were pushed, so it cannot walk anyone off the site. A run
  // restored into a fresh tab has none, and replaces the entry it stands on.
  const pushed = useRef(0)

  // A run keeps the deal it was given. Shuffling again on every mount moved the
  // remaining questions around underneath the reader, and the progress count
  // with them — the same question read "1 de 14" before a refresh and "6 de 14"
  // after it — while the alternatives swapped places under a question that had
  // not changed.
  const questions = useMemo(
    () => buildRulesQuestions(readRulesDeal(runId) ?? undefined),
    [runId],
  )

  useEffect(() => {
    writeRulesDeal(runId, dealOf(questions))
  }, [runId, questions])

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
    () => buildRulesFlow(questions, commit, { isVeteran: loaderData.isVeteran }),
    [questions, commit, loaderData.isVeteran],
  )

  // Answering fourteen screens to reach the next page is the cost of testing
  // anything past the quiz, and it is a cost only development pays. The answers
  // still travel to the same check, so the gate is the one everyone passes.
  const skipQuiz = useCallback(async () => {
    const result = await commit(buildCorrectRulesAnswers())
    if (!result.ok) return

    void navigate(EVENT_DATA(eventId))
  }, [commit, eventId, navigate])

  const notice = !loaderData.isVeteran
    ? undefined
    : screensAhead !== null && screensAhead > SHORT_RUN_LENGTH
      ? rulesQuizCopy.veteranLostWager
      : rulesQuizCopy.veteranWager

  return (
    <Wrapper notice={notice}>
      <FormRunner
        // The runtime seeds its answers and its first-attempt records once, at
        // mount. A loader that comes back with someone else while the route
        // stays put would otherwise leave them holding the previous person's
        // run — in memory, where no storage key can separate them.
        key={runId}
        questions={questions}
        flow={flow}
        presentation={OneAtATime}
        persistence={{ formId: "rules", scopeId: runId }}
        stepId={requestedStep}
        onProgressChange={(progress) => {
          setScreens(progress ? { runId, total: progress.total } : null)
        }}
        onStepChange={(step, { direction }) => {
          if (direction === "back" && pushed.current > 0) {
            pushed.current -= 1
            void navigate(-1)
            return
          }

          // The question the quiz opens on is where the reader already is;
          // only the ones they walk to are worth a trip back. Neither is a
          // step reached backwards with nothing of the quiz's own to pop.
          const replace = !mirrored || direction === "back"
          if (!replace) pushed.current += 1

          setSearchParams(
            (current) => {
              const next = new URLSearchParams(current)
              next.set(STEP_PARAM, step)
              return next
            },
            {
              replace,
              // Every step is a navigation, and the quiz sits under the whole
              // rules text. Letting the router reset the scroll would throw the
              // reader back to the top of the rules on every answer.
              preventScrollReset: true,
            },
          )
        }}
        onDone={() => {
          // The run is over, so the deal goes with it — a second attempt is
          // dealt again, which is the point of shuffling.
          clearRulesDeal(runId)
          void navigate(EVENT_DATA(eventId))
        }}
      />

      {ENV.NODE_ENV !== "production" && (
        <Button
          className="mt-8"
          variant="outline"
          onClick={() => {
            void skipQuiz()
          }}
        >
          {rulesQuizCopy.skipQuizDev}
        </Button>
      )}
    </Wrapper>
  )
}

export default EventRulesPage
