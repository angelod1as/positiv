import { useCallback, useEffect, useMemo, useState } from "react"
import { redirect, useNavigate } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { likertScaleCache } from "~/business/cms/likert-scale-cache.server"
import { canSeeLikert } from "~/business/profile/likert-answers.server"
import { Copy } from "~/components/atoms/copy/copy"
import { buildLikertFlow } from "~/components/forms/custom/likert/build-likert-flow"
import { buildLikertQuestions } from "~/components/forms/custom/likert/build-likert-questions"
import { LikertKeyboardHelp } from "~/components/forms/custom/likert/likert-keyboard-help"
import { LikertOneAtATime } from "~/components/forms/custom/likert/likert-one-at-a-time"
import {
  clearLikertOrder,
  likertOrder,
  readLikertOrder,
  writeLikertOrder,
} from "~/components/forms/custom/likert/likert-order"
import { commitJson } from "~/components/forms/runtime/commit-json"
import { likertSchema } from "~/components/forms/runtime/likert"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import {
  readRuntimeState,
  runtimeStorageKey,
} from "~/components/forms/runtime/persistence"
import type { Answers } from "~/components/forms/runtime/question.types"
import { Skeleton } from "~/components/ui/skeleton"
import { likertPageCopy as copy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import { assertUuidParams } from "~/lib/helpers/assert-uuid-params"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"
import type { Route } from "./+types/likert-answer-page"

const {
  dash: {
    account: { ACCOUNT, LIKERT, LIKERT_COMMIT },
    events: { EVENT_RULES },
  },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.likert.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)
  if (!currentProfile || !(await canSeeLikert(currentProfile))) {
    return redirect(ACCOUNT)
  }

  const eventId = new URL(request.url).searchParams.get("evento")
  assertUuidParams(eventId ?? undefined)

  const scale = await likertScaleCache.get()

  return {
    statements: scale?.statements ?? null,
    profileId: currentProfile.id,
    eventId,
  }
}

function fingerprint(statements: { key: string; text: string }[]): string {
  let hash = 5381
  for (const char of JSON.stringify(statements)) {
    hash = ((hash << 5) + hash + char.charCodeAt(0)) | 0
  }
  return (hash >>> 0).toString(36)
}

const FORM_ID = "likert"

const LikertAnswerPage = ({ loaderData }: Route.ComponentProps) => {
  const { statements, profileId, eventId } = loaderData
  const navigate = useNavigate()

  // A draft kept against other statements, or other wording, would save
  // answers to questions the person was never asked.
  const draftScope = useMemo(
    () => `${profileId}:${fingerprint(statements ?? [])}`,
    [profileId, statements],
  )

  // Drawn in the browser, where the run is kept, so the server renders no order.
  const [order, setOrder] = useState<string[] | null>(null)

  useEffect(() => {
    if (!statements) return

    const draft = readRuntimeState(
      runtimeStorageKey(FORM_ID, draftScope),
      "local",
    )
    const next = likertOrder(
      statements.map((statement) => statement.key),
      readLikertOrder(draftScope),
      // Answered means a point picked: a comment alone leaves it waiting.
      new Set(
        Object.entries(draft?.answers ?? {})
          .filter(([, answer]) => likertSchema.safeParse(answer).success)
          .map(([key]) => key),
      ),
    )

    writeLikertOrder(draftScope, next)
    setOrder(next)
  }, [statements, draftScope])

  const questions = useMemo(() => {
    if (!statements || !order) return []

    const byKey = new Map(
      statements.map((statement) => [statement.key, statement]),
    )
    return buildLikertQuestions(order.flatMap((key) => byKey.get(key) ?? []))
  }, [statements, order])

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> =>
      commitJson(LIKERT_COMMIT, answers, (pathname) => void navigate(pathname)),
    [navigate],
  )

  const flow = useMemo(
    () => buildLikertFlow(questions, commit),
    [questions, commit],
  )

  return (
    <>
      <h1>{copy.title}</h1>

      {eventId ? <Copy>{copy.beforeApplying}</Copy> : null}

      {statements ? (
        <>
          <p>
            <Copy inline>{copy.answerIntro}</Copy> <LikertKeyboardHelp />
          </p>
          {order ? (
            <FormRunner
              key={draftScope}
              questions={questions}
              flow={flow}
              presentation={LikertOneAtATime}
              persistence={{
                formId: FORM_ID,
                scopeId: draftScope,
                storage: "local",
                resume: "first-unanswered",
              }}
              pendingLabel={copy.sending}
              onDone={() => {
                clearLikertOrder(draftScope)
                void navigate(eventId ? EVENT_RULES(eventId) : LIKERT)
              }}
            />
          ) : (
            <div className="flex flex-col gap-8" aria-busy="true">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          )}
        </>
      ) : (
        <Copy>{copy.unavailable}</Copy>
      )}
    </>
  )
}

export default LikertAnswerPage
